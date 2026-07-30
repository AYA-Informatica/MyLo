'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');

    await queryInterface.createTable('documents', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      filename: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      embedding: {
        type: 'vector(1536)',
        allowNull: false,
      },
      filepath: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('documents', ['filename'], {
      name: 'idx_documents_filename',
    });

    await queryInterface.addIndex('documents', ['created_at'], {
      name: 'idx_documents_created_at',
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('documents');
    await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS vector;');
  },
};
