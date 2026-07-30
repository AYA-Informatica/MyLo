'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('history', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      question: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      answer: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      source: {
        type: Sequelize.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['database', 'web']],
        },
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
    });

    await queryInterface.addIndex('history', ['created_at'], {
      name: 'idx_history_created_at',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('history');
  },
};
