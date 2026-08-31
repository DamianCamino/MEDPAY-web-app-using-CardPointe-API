/**
 * Payment gateway interface — all processors (NMI, CardPointe, etc.) implement this contract.
 */

class PaymentGateway {
  constructor(name) {
    this.name = name;
  }

  async tokenize(_cardData) {
    throw new Error(`${this.name}: tokenize() not implemented`);
  }

  async authorize(_transaction) {
    throw new Error(`${this.name}: authorize() not implemented`);
  }

  async capture(_transaction) {
    throw new Error(`${this.name}: capture() not implemented`);
  }

  async void(_transaction) {
    throw new Error(`${this.name}: void() not implemented`);
  }

  async refund(_transaction) {
    throw new Error(`${this.name}: refund() not implemented`);
  }

  async inquire(_transaction) {
    throw new Error(`${this.name}: inquire() not implemented`);
  }

  isApproved(response) {
    return response?.respstat === 'A' || response?.success === true;
  }

  getChargeId(response) {
    return response?.retref || response?.chargeId || response?.id;
  }
}

module.exports = { PaymentGateway };
