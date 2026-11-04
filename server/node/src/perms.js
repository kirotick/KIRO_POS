'use strict';
// One place that says who may do what. The app hides buttons using the same table (GET /me returns it),
// but the server is the real gate.
const ROLES = ['owner', 'manager', 'accounts', 'pos'];
const TABLE = {
  'sales:create': ['owner', 'manager', 'pos'],
  'sales:viewAll': ['owner', 'manager', 'accounts'],   // pos sees only their own bills
  'reports:view': ['owner', 'manager', 'accounts'],
  'insights:view': ['owner', 'manager', 'accounts'],
  'ask:use': ['owner', 'manager', 'accounts'],
  'items:write': ['owner', 'manager'],
  'items:viewCost': ['owner', 'manager', 'accounts'],
  'price:override': ['owner', 'manager'],
  'discount:any': ['owner', 'manager'],                // pos discount is capped by POS_MAX_DISCOUNT_PCT
  'staff:manage': ['owner'],
  'payments:configure': ['owner'],
};
const can = (role, perm) => !!TABLE[perm] && TABLE[perm].includes(role);
const listFor = (role) => Object.keys(TABLE).filter((p) => TABLE[p].includes(role));
module.exports = { ROLES, can, listFor };
