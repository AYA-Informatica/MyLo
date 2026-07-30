'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('profiles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userRole: {
        type: Sequelize.ENUM('citizen', 'organization', 'law-firm'),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      occupation: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      website: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      phoneNumber: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      socials: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      teamSize: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      yearsOfExperience: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      caseResolved: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      successRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      establishedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      deletedAt: {
        allowNull: true,
        type: Sequelize.DATE,
        defaultValue: null,
      },
    });

    // Add index for faster queries
    await queryInterface.addIndex('profiles', ['userId']);
    await queryInterface.addIndex('profiles', ['userRole']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('profiles');
  },
};