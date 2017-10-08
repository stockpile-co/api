const auth = require('./auth')
const checkSubscription = require('../services/check-subscription')
const db = require('../services/db')
const endpoint = require('../services/endpoint')
const filterQuery = require('../services/filter-query')
const paginate = require('../services/paginate')

const messages = {
  missing: 'Item does not exist'
}

const item = module.exports

item.withFieldsAndFilters = (req, queryBuilder) => {
  // Mapping between query param fields and database query column names
  const filterParams = new Map()
  filterParams.set('brandID', 'brand.brandID')
  filterParams.set('modelID', 'model.modelID')
  filterParams.set('categoryID', 'category.categoryID')
  filterParams.set('available', 'itemStatus.available')

  return queryBuilder
    .select('item.*')

  // Model
    .leftJoin('model', 'item.modelID', 'model.modelID')
    .select('model.name as model')
    .select('model.brandID')

  // Brand
    .leftJoin('brand', 'model.brandID', 'brand.brandID')
    .select('brand.name as brand')

  // Category
    .leftJoin('category', 'item.categoryID', 'category.categoryID')
    .select('category.name as category')

  // Status
    .leftJoin('itemStatus', 'item.barcode', 'itemStatus.barcode')
    .select('itemStatus.available as available')

  // Add filters to query
    .modify(filterQuery(req, filterParams))

  // Add pagination
    .modify(paginate.paginateQuery, req, 'item')
}

item.paginateRentals = (req, queryBuilder) => {
  return queryBuilder
    .modify(paginate.paginateQuery, req, 'rental')
}

// Get active rental associated with item
item.withActiveRental = (req, queryBuilder) => {
  return queryBuilder
    .where('rental.returnDate', null)
    .orderBy('rental.startDate', 'ascending')
}
const sortBy = [
  {column: 'brand', ascending: true},
  {column: 'model', ascending: true}
]
item.getAll = endpoint.getAll('item', {modify: item.withFieldsAndFilters, sortBy})
item.get = endpoint.get('item', 'barcode',
  {modify: item.withFieldsAndFilters, messages})
item.create = endpoint.create('item', 'barcode',
  {resModify: item.withFieldsAndFilters})
item.update = endpoint.update('item', 'barcode',
  {resModify: item.withFieldsAndFilters})
item.delete = endpoint.delete('item', 'barcode'
)
item.getRentals = endpoint.getAll('rental', {modify: item.paginateRentals})
item.getActiveRental = endpoint.get('rental', 'barcode',
  {modify: item.withActiveRental})
item.getStatus = endpoint.get('itemStatus', 'barcode', {hasOrganizationID: false})

// Custom fields
item.forItem = (req, queryBuilder) => {
  return queryBuilder
    // Only get rows for this item
    .where('barcode', req.params.barcode)
}
// Add custom fields to "get all items" query
item.withCustomFields = (req, queryBuilder) => {
  const selectColumns = [
    'customField.name as customFieldName',
    'customField.customFieldID',
    'customField.organizationID',
    'category.name as categoryName',
    'itemCustomField.value'
  ]
  return queryBuilder
    .select(selectColumns)
    // Get custom fields for the item's category
    .join('customFieldCategory', 'item.categoryID', 'customFieldCategory.categoryID')
    .join('customField', 'customFieldCategory.customFieldID', 'customField.customFieldID')
    // Get category
    .join('category', 'customFieldCategory.categoryID', 'category.categoryID')
    // Get values
    .leftJoin('itemCustomField', 'customField.customFieldID', 'itemCustomField.customFieldID')
    // Only get rows for this item
    .where('item.barcode', req.params.barcode)
    // Get custom fields that apply to items in all categories
    .union(function () {
      this.select(selectColumns)
        .from('customField')
        // Join all custom fields with all categories (`categoryID = null` if no categories are specified)
        .leftJoin('customFieldCategory', 'customField.customFieldID', 'customFieldCategory.customFieldID')
        // Get nonexistent category so that the columns are the same as the previous query and the union succeeds
        .leftJoin('category', 'customFieldCategory.categoryID', 'category.categoryID')
        // Get values
        .leftJoin('itemCustomField', 'customField.customFieldID', 'itemCustomField.customFieldID')
        // Only get rows for this item
        .where('itemCustomField.barcode', req.params.barcode)
        .where('customFieldCategory.categoryID', null)
        .andWhere('customField.organizationID', req.user.organizationID)
    })
}
item.getCustomFields = endpoint.getAll('item', {
  modify: item.withCustomFields
})
item.getCustomField = endpoint.get('itemCustomField', 'customFieldID', {
  modify: item.forItem,
  hasOrganizationID: false
})
item.updateCustomField = (req, res, next) => {
  const columns = ['barcode', 'customFieldID', 'value']
  const values = [req.params.barcode, req.params.customFieldID, req.body.value]

  // Insert or update item custom field value
  return db.raw('replace into itemCustomField (??) values (?)', [columns, values])
    .then(() => db('itemCustomField')
      .where({barcode: req.params.barcode, customFieldID: req.params.customFieldID}).first()
    ).then(({value}) => {
      res.send({
        message: 'Updated item custom field',
        value
      })
    })
    .then(next)
    .catch(err => endpoint.handleError(err, {}, next, req))
}
item.deleteCustomField = endpoint.delete('itemCustomField', 'customFieldID', {
  modify: item.forItem,
  hasOrganizationID: false
})

item.mount = app => {
  /**
   * @apiDefine Pagination
   *
   * @apiParam (Pagination) {Number{0..}} [limit] Max rows in response
   * @apiParam (Pagination) {Number{0..}} [offset] Rows to offset response by
   */

  /**
   * @apiDefine ItemResponse
   *
   * @apiExample {json} Response Format
   * {
   *   "organizationID": 0,
   *   "modelID": 0,
   *   "categoryID": 0,
   *   "barcode": "234234",
   *   "notes": ""
   * }
   */

  /**
   * @api {get} /item Get all items
   * @apiName GetItems
   * @apiGroup Item
   * @apiPermission User
   * @apiVersion 2.0.0
   *
   * @apiDescription This endpoint can be filtered using the query parameters
   * specified below. Any of the filters can be applied at the same time in
   * any order.
   *
   * @apiParam (Filter) {Number} [brandID] Return items with only this brandID
   * @apiParam (Filter) {Number} [modelID] Return items with only this modelID
   * @apiParam (Filter) {Number} [categoryID] Return items with only this
   *   categoryID
   * @apiParamExample Filter brand and model
   * /item?brandID=0&modelID=0
   * @apiParamExample Filter category
   * /item?categoryID=0
   *
   *
   * @apiUse Pagination
   * @apiParamExample Paginate response
   * /item?limit=10&offset=10
   *
   * @apiExample {json} Response Format
   * {
   *   results: [
   *     {
   *       "organizationID": 0,
   *       "modelID": 0,
   *       "categoryID": 0,
   *       "barcode": "234234",
   *       "notes": "",
   *       "sortIndex": 0
   *     }
   *   ]
   * }
   */
  app.get({name: 'get all items', path: 'item'}, auth.verify, item.getAll)
  /**
   * @api {get} /item/:barcode Get an item
   * @apiName GetItem
   * @apiGroup Item
   * @apiPermission User
   * @apiVersion 2.0.0
   *
   * @apiUse ItemResponse
   */
  app.get({name: 'get item', path: 'item/:barcode'}, auth.verify, item.get)
  /**
   * @api {put} /item Create an item
   * @apiName CreateItem
   * @apiGroup Item
   * @apiPermission User
   * @apiVersion 2.0.0
   *
   * @apiDescription An item represents a physical object owned by the
   *   organization. Items must have physical barcodes in order for the
   *   application to be able to identify them.
   *
   * @apiParam {Number} [modelID] ID of model
   * @apiParam {Number} [categoryID] ID of category
   * @apiParam {String} barcode Unique identifier of item
   * @apiParam {String{0..1000}} [notes] Notes about item
   *
   * @apiUse ItemResponse
   * @apiUse InvalidSubscriptionResponse
   */
  app.put({name: 'create item', path: 'item'}, auth.verify, checkSubscription, item.create)
  /**
   * @api {put} /item/:barcode Update item
   * @apiName UpdateItem
   * @apiGroup Item
   * @apiPermission User
   * @apiVersion 2.0.0
   *
   * @apiParam {Number} [modelID] ID of model
   * @apiParam {Number} [categoryID] ID of category
   * @apiParam {String} [barcode] Unique identifier of item
   * @apiParam {String{0..1000}} [notes] Notes about item
   *
   * @apiUse ItemResponse
   * @apiUse InvalidSubscriptionResponse
   */
  app.put({name: 'update item', path: 'item/:barcode'}, auth.verify, checkSubscription, item.update)
  /**
   * @api {delete} /item/:barcode Delete item
   * @apiName DeleteItem
   * @apiGroup Item
   * @apiPermission User
   * @apiVersion 2.0.0
   *
   * @apiUse EndpointDelete
   * @apiUse InvalidSubscriptionResponse
   */
  app.del({name: 'delete item', path: 'item/:barcode'}, auth.verify, checkSubscription, item.delete)
  /**
   * @api {get} /item/:barcode/rentals Get rentals of an item
   * @apiName GetItemRentals
   * @apiGroup Item
   * @apiPermission User
   * @apiVersion 2.0.0
   *
   * @apiUse Pagination
   *
   * @apiExample {json} Response Format
   * {
   *   "results": [
   *     "endDate": "2017-02-23T05:00:00.000Z",
   *     "organizationID": 0,
   *     "rentalID": 0,
   *     "returnDate": null,
   *     "startDate": "2017-02-22T05:00:00.000Z",
   *     "barcode": "",
   *     "userID": 0,
   *     "notes": "",
   *     "externalRenterID": 0
   *   ]
   * }
   */
  app.get({name: 'get item rentals', path: 'item/:barcode/rentals'}, auth.verify, item.getRentals)
  /**
   * @api {get} /item/:barcode/rental/active Get active rental of an item
   * @apiName GetItemActiveRental
   * @apiGroup Item
   * @apiPermission User
   * @apiVersion 2.0.0
   *
   * @apiExample {json} Response Format
   * {
   *   "endDate": "2017-02-23T05:00:00.000Z",
   *   "organizationID": 0,
   *   "rentalID": 0,
   *   "returnDate": null,
   *   "startDate": "2017-02-22T05:00:00.000Z",
   *   "barcode": "",
   *   "userID": 0,
   *   "notes": "",
   *   "externalRenterID": 0
   * }
   *
   * @apiError 404 No active rental
   */
  app.get({name: 'get item active rental', path: 'item/:barcode/rental/active'}, auth.verify, item.getActiveRental)
  /**
   * @api {get} /item/:barcode/status Get status of an item
   * @apiName GetItemStatus
   * @apiGroup Item
   * @apiPermission User
   * @apiVersion 2.0.0
   *
   * @apiDescription An item's status is either available or unavailable. In the
   *   response from this endpoint, the `available` property will equal either
   *   `1` or `0`, respectively. An item is considered available if there are no
   *   rentals for it or if all of the rentals for it have `returnDate` set.
   *
   *   **Note:** `organizationID` is deprecated and will be removed in a future
   *   release.
   *
   * @apiExample {json} Response Format
   * {
   *   "available": 0,
   *   "barcode": "",
   *   "organizationID": 0
   * }
   */
  app.get({name: 'get item status', path: 'item/:barcode/status'}, auth.verify, item.getStatus)
  /**
   * @api {get} /item/:barcode/custom-field Get item custom fields
   * @apiName GetItemCustomFields
   * @apiGroup ItemCustomField
   * @apiPermission User
   * @apiVersion 2.0.0
   *
   * @apiDescription The `categoryName` is the name of the item's category, and also the category that the custom field
   *   applies to. When `categoryName` is `null`, the custom field applies to all categories. When `value` is `null`, no
   *   value has been set for this custom field for this item.
   *
   * @apiExample {json} Response Format
   * {
   *   "results": [
   *     {
   *       "categoryName": "",
   *       "customFieldID": 0,
   *       "customFieldName": "",
   *       "organizationID": 0,
   *       "value": "",
   *       "sortIndex": 0
   *     }
   *   ]
   * }
   */
  app.get({name: 'get item custom fields', path: 'item/:barcode/custom-field'}, auth.verify, item.getCustomFields)
  /**
   * @api {get} /item/:barcode/custom-field/:customFieldID Get item custom field
   * @apiName GetItemCustomField
   * @apiGroup ItemCustomField
   * @apiPermission User
   * @apiVersion 2.0.0
   *
   * @apiExample {json} Response Format
   * {
   *   "barcode": "",
   *   "customFieldID": 0,
   *   "value": ""
   * }
   */
  app.get({name: 'get item custom field', path: 'item/:barcode/custom-field/:customFieldID'}, auth.verify,
    item.getCustomField)
  /**
   * @api {put} /item/:barcode/custom-field/:customFieldID Update item custom field
   * @apiName UpdateItemCustomField
   * @apiGroup ItemCustomField
   * @apiPermission User
   * @apiVersion 2.0.0
   *
   * @apiDescription Sets the value for a custom field for an item.
   *
   * @apiParam {String{0..1000}} value A value for the custom field
   *
   * @apiExample {json} Response Format
   * {
   *   "message": "Updated item custom field",
   *   "value": ""
   * }
   *
   * @apiUse InvalidSubscriptionResponse
   */
  app.put({name: 'update item custom field', path: 'item/:barcode/custom-field/:customFieldID'}, auth.verify,
    checkSubscription, item.updateCustomField)
  /**
   * @api {delete} /item/:barcode/custom-field/:customFieldID Delete item custom field
   * @apiName DeleteItemCustomField
   * @apiGroup ItemCustomField
   * @apiPermission User
   * @apiVersion 2.0.0
   *
   * @apiDescription Unset the value of a custom field for an item.
   *
   * @apiUse EndpointDelete
   *
   * @apiUse InvalidSubscriptionResponse
   */
  app.del({name: 'delete item custom field', path: 'item/:barcode/custom-field/:customFieldID'}, auth.verify,
    checkSubscription, item.deleteCustomField)
}
