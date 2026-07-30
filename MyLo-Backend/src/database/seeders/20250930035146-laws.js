'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if laws already exist
    const existing = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM laws;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (parseInt(existing[0].count, 10) > 0) {
      console.log('Laws already seeded. Skipping...');
      return;
    }

    // Fetch domains and origins
    const domains = await queryInterface.sequelize.query(
      'SELECT id FROM domains;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const origins = await queryInterface.sequelize.query(
      'SELECT id FROM origins;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Sample law data
    const sampleLaws = [
      {
        lawNumber: 'LAW-001',
        title: 'Criminal Justice Reform Act',
        description: 'An act to reform criminal justice procedures and sentencing.',
        status: 'Active',
        language: 'EN',
        tags: JSON.stringify(['justice', 'criminal', 'reform']),
      },
      {
        lawNumber: 'LAW-002',
        title: 'Digital Privacy Protection Bill',
        description: 'A bill to enforce digital privacy rights for citizens.',
        status: 'Amended',
        language: 'FR',
        tags: JSON.stringify(['privacy', 'technology', 'rights']),
      },
      {
        lawNumber: 'LAW-003',
        title: 'Environmental Safeguards Act',
        description: 'Legislation to protect natural resources and biodiversity.',
        status: 'Active',
        language: 'RW',
        tags: JSON.stringify(['environment', 'conservation']),
      },
      {
        lawNumber: 'LAW-004',
        title: 'Corporate Tax Regulation',
        description: 'Regulations governing corporate taxation and compliance.',
        status: 'Repealed',
        language: 'EN',
        tags: JSON.stringify(['tax', 'corporate']),
      },
    ];

    // Generate law entries with random domain and origin
    const laws = sampleLaws.map((law) => {
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const origin = origins[Math.floor(Math.random() * origins.length)];

      return {
        id: uuidv4(),
        lawNumber: law.lawNumber,
        title: law.title,
        description: law.description,
        publishedAt: new Date(),
        originId: origin.id,
        domainId: domain.id,
        status: law.status,
        language: law.language,
        tags: law.tags,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    await queryInterface.bulkInsert('laws', laws);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('laws', null, {});
  },
};
