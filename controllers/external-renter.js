const auth = require('./auth')
const endpoint = require('../services/endpoint')

const messages = {
  missing: 'External renter does not exist'
}

const externalRenter = module.exports

endpoint.addAllMethods(externalRenter, 'externalRenter', 'externalRenterID')
externalRenter.get = endpoint.get('externalRenter', 'externalRenterID',
                                  {messages})

externalRenter.mount = app => {
  /**
   * @apiDefine ExternalRenterResponse
   *
   * @apiExample {json} Response format:
   * {
   *   "externalRenterID": 0,
   *   "organizationID": 0,
   *   "name": "",
   *   "email": "".
   *   "phone": ""
   * }
   */

  /**
   * @api {get} /external-renter Get all external renters
   * @apiName GetCategories
   * @apiGroup ExternalRenter
   *
   * @apiExample {json} Response format:
   * {
   *   results: [
   *     {
   *       "externalRenterID": 0,
   *       "organizationID": 0,
   *       "name": "",
   *       "email": "".
   *       "phone": ""
   *     }
   *   ]
   * }
   */
  app.get({name: 'get all external renters', path: 'external-renter'},
          auth.verify, externalRenter.getAll)
  /**
   * @api {get} /external-renter/:externalRenterID Get external renter
   * @apiName GetExternalRenter
   * @apiGroup ExternalRenter
   *
   * @apiUse ExternalRenterResponse
   */
  app.get(
    {name: 'get external renter', path: 'external-renter/:externalRenterID'},
    auth.verify, externalRenter.get)
  /**
   * @api {put} /external-renter Create an external renter
   * @apiName CreateExternalRenter
   * @apiGroup ExternalRenter
   *
   * @apiParam {String{0..255}} name Name of company or individual
   * @apiParam {String{0..255}} [email] Email address
   * @apiParam {String{10}} [phone] Phone number
   * @apiParam {Number} [organizationID] ID of organization (automatically taken
   *   from token, but can be overridden)
   * @apiSuccess (200) {Number} id ID of created row
   *
   * @apiSuccess (200) {String} message Descriptive message
   */
  app.put({name: 'create external renter', path: 'externalRenter'},
          auth.verify, externalRenter.create)
  /**
   * @api {put} /external-renter/:externalRenterID Update an external renter
   * @apiName UpdateExternalRenter
   * @apiGroup ExternalRenter
   *
   * @apiParam {String{0..255}} [name] Name of company or individual
   * @apiParam {String{0..255}} [email] Email address
   * @apiParam {String{10}} [phone] Phone number
   * @apiParam {Number} [organizationID] ID of organization (automatically taken
   *   from token, but can be overridden)
   *
   * @apiUse ExternalRenterResponse
   */
  app.put(
    {name: 'update external renter', path: 'external-renter/:externalRenterID'},
    auth.verify, externalRenter.update)
  /**
   * @api {delete} /external-renter/:externalRenterID Delete an external renter
   * @apiName DeleteExternalRenter
   * @apiGroup ExternalRenter
   *
   * @apiSuccess (200) {String} message Descriptive message
   * @apiSuccess (204) empty No body when item was already deleted
   */
  app.del(
    {name: 'delete external renter', path: 'external-renter/:externalRenterID'},
    auth.verify, externalRenter.delete)
}