'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const origins = await queryInterface.sequelize.query(`SELECT COUNT(*) as count FROM origins;`, {
      type: Sequelize.QueryTypes.SELECT,
    });

    if (origins[0].count > 0) {
      console.log('Origins already seeded. Skipping...');
      return;
    }
    await queryInterface.bulkInsert('origins', [
      {
        id: uuidv4(),
        name: 'Presidential',
        description: 'Originating from presidential authority or decree',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Ministerial',
        description: 'Issued or authorized by a government ministry',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Parliamentary',
        description: 'Established through parliamentary legislation or debate',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Judicial',
        description: 'Derived from court rulings or judicial precedent',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Administrative',
        description: 'Created by administrative bodies or local authorities',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('origins', null, {});
  },
};
