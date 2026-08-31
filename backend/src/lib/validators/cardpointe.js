const { z } = require('zod');

const authSchema = z.object({
  merchid: z.string().min(1),
  account: z.string().min(1),
  expiry: z.string().regex(/^\d{4}$/).optional(),
  amount: z.string().regex(/^\d+$/),
  currency: z.string().length(3).default('USD'),
  capture: z.enum(['Y', 'N', 'y', 'n']).default('Y'),
  name: z.string().optional(),
  // AVS billing ZIP/postal code. Alphanumeric (not digits-only) to support
  // international postal codes (e.g. Canada, UK) per CardPointe docs — pair
  // with `country` when sending a non-numeric postal code.
  postal: z.string().max(10).optional(),
  country: z.string().length(2).optional(),
  // Required by Fiserv for all card-not-present authorizations (flagged in
  // CardPointe Gateway validation feedback). "E" = e-commerce.
  // No schema default here — CardPointeGateway.authorize() already omits
  // this for ACH transactions, and a schema-level default would override
  // that and force "E" onto ACH payloads too.
  ecomind: z.enum(['E', 'R', 'T']).optional(),
  accttype: z.enum(['ECHK', 'ESAV']).optional(),
  achDescription: z.string().optional(),
  achEntryCode: z.string().optional(),
});

const captureSchema = z.object({
  merchid: z.string().min(1),
  retref: z.string().min(1),
  amount: z.string().regex(/^\d+$/).optional(),
});

const retrefSchema = z.object({
  merchid: z.string().min(1),
  retref: z.string().min(1),
  amount: z.string().regex(/^\d+$/).optional(),
});

const tokenizeSchema = z.object({
  account: z.string().min(1),
  expiry: z.string().regex(/^\d{4}$/).optional(),
  cvv: z.string().optional(),
});

module.exports = {
  authSchema,
  captureSchema,
  retrefSchema,
  tokenizeSchema,
};
