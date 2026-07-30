'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const domains = await queryInterface.sequelize.query(`SELECT COUNT(*) as count FROM domains;`, {
      type: Sequelize.QueryTypes.SELECT,
    });

    if (domains[0].count > 0) {
      console.log('domains already seeded. Skipping...');
      return;
    }

    await queryInterface.bulkInsert('domains', [
      {
        id: uuidv4(),
        name: 'Criminal Law',
        description: 'Legal domain dealing with crimes and their prosecution',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Civil Law',
        description: 'Legal domain focused on disputes between individuals or organizations',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Corporate Law',
        description: 'Legal domain governing business and corporate entities',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Family Law',
        description: 'Legal domain covering marriage, divorce, child custody, and related matters',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Intellectual Property',
        description: 'Legal domain protecting inventions, trademarks, and creative works',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('domains', null, {});
  },
};
