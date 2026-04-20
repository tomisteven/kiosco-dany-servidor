const Sale = require('../models/Sale');

const generateTicketNumber = async () => {
  const lastSale = await Sale.findOne().sort({ numeroTicket: -1 });

  if (lastSale && lastSale.numeroTicket) {
    // Ejemplo: 'T-0042'
    const lastNumber = parseInt(lastSale.numeroTicket.split('-')[1]);
    const nextNumber = lastNumber + 1;
    return `T-${nextNumber.toString().padStart(4, '0')}`;
  } else {
    return 'T-0001';
  }
};

module.exports = generateTicketNumber;
