const jwt = require('jwt-simple')

const auth = require('./auth')
const endpoint = require('../services/endpoint')
const paginate = require('../services/paginate')

const rental = module.exports

// Join rental with item to get the item's barcode
rental.withBarcode = (req, queryBuilder) => {
  return queryBuilder
    .select('rental.*')
    .leftJoin('item', 'rental.itemID', 'item.itemID')
    .select('item.barcode')
}

rental.withBarcodeAndPagination = (req, queryBuilder) => {
  return rental.withBarcode(req, queryBuilder)
    .modify(paginate.paginateQuery, req, 'rental')
}

// Get user ID from token and add to request body
rental.addUserID = function addUserID (req, res, next) {
  try {
    const token = req.headers.authorization.replace('Bearer ', '')
    const payload = jwt.decode(token, process.env.JWT_SECRET)
    req.body.userID = payload.userID
    return next()
  } catch (err) {
    return next(err)
  }
}

const messages = {
  conflict: 'Cannot rent item, item is already rented',
  missing: 'Rental does not exist'
}

rental.getAll = endpoint.getAll('rental',
                                {modify: rental.withBarcodeAndPagination})
rental.get = endpoint.get('rental', 'barcode',
                          {modify: rental.withBarcode, messages})
rental.create = endpoint.create('rental', {messages})
rental.update = endpoint.update('rental', 'rentalID', {messages})
rental.delete = endpoint.delete('rental', {modify: rental.withBarcode})

rental.mount = app => {
  /**
   * @apiDefine Pagination
   *
   * @apiParam (Pagination) {Number{0..}} [limit] Max rows in response
   * @apiParam (Pagination) {Number{0..}} [offset] Rows to offset response by
   */

  /**
   * @apiDefine RentalResponse
   *
   * @apiExample {json} Response format:
   * {
   *   "endDate": "2017-02-23T05:00:00.000Z",
   *   "itemID": 0,
   *   "organizationID": 0,
   *   "rentalID": 0,
   *   "returnDate": null,
   *   "startDate": "2017-02-22T05:00:00.000Z",
   *   "barcode": "",
   *   "userID": 0
   * }
   */

  /**
   * @api {get} /rental Get all rentals
   * @apiName GetRentals
   * @apiGroup Rental
   * @apiPermission User
   *
   * @apiUse Pagination
   *
   * @apiExample {json} Response format:
   * {
   *   "results": [
   *     "endDate": "2017-02-23T05:00:00.000Z",
   *     "itemID": 0,
   *     "organizationID": 0,
   *     "rentalID": 0,
   *     "returnDate": null,
   *     "startDate": "2017-02-22T05:00:00.000Z",
   *     "barcode": "",
   *     "userID": 0
   *   ]
   * }
   */
  app.get({name: 'get all rentals', path: 'rental'}, auth.verify, rental.getAll)
  /**
   * @api {get} /rental/:rentalID Get a rental
   * @apiName GetRental
   * @apiGroup Rental
   * @apiPermission User
   *
   * @apiUse RentalResponse
   */
  app.get({name: 'get rental', path: 'rental/:barcode'},
          auth.verify, rental.get)
  /**
   * @api {put} /rental Create a rental
   * @apiName CreateRental
   * @apiGroup Rental
   * @apiPermission User
   *
   * @apiSuccess (200) {String} message Descriptive message
   * @apiSuccess (200) {Number} id ID of created row
   */
  app.put({name: 'create rental', path: 'rental'}, auth.verify,
          rental.addUserID, rental.create)
  /**
   * @api {put} /rental/:rentalID Update a rental
   * @apiName UpdateRental
   * @apiGroup Rental
   * @apiPermission User
   *
   * @apiUse RentalResponse
   */
  app.put({name: 'update rental', path: 'rental/:rentalID'},
          auth.verify, rental.update)
  /**
   * @api {delete} /rental/:rentalID Delete a rental
   * @apiName DeleteRental
   * @apiGroup Rental
   * @apiPermission Administrator
   *
   * @apiSuccess (200) {String} message Descriptive message
   * @apiSuccess (204) empty No body when item was already deleted
   */
  app.del({name: 'delete rental', path: 'rental/:rentalID'},
          auth.verify, auth.checkAdmin, rental.delete)
}
