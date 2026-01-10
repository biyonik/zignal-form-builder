/// <reference types="cypress" />

describe('Zignal Form Builder', () => {
  beforeEach(() => {
    cy.visit('/');
    // Clear localStorage before each test
    cy.clearLocalStorage();
  });

  describe('Basic Functionality', () => {
    it('should load the form builder interface', () => {
      cy.contains('Zignal Form Builder').should('be.visible');
      // Check that main sections are visible
      cy.get('[data-section="field-types"]').should('be.visible');
      cy.get('[data-section="canvas"]').should('be.visible');
      cy.get('[data-section="config-panel"]').should('be.visible');
    });

    it('should add a string field to the form', () => {
      // Add a string field
      cy.get('[data-field-type="string"]').click();

      // Verify field appears in canvas
      cy.get('[data-canvas]').within(() => {
        cy.contains('New Field').should('be.visible');
      });
    });

    it('should configure field properties', () => {
      // Add field
      cy.get('[data-field-type="string"]').click();

      // Open config panel
      cy.get('[data-canvas] [data-field]:first').click();

      // Configure field
      cy.get('[data-config="label"]').clear().type('First Name');
      cy.get('[data-config="name"]').clear().type('firstName');
      cy.get('[data-config="required"]').check();
      cy.get('[data-config="placeholder"]').type('Enter your first name');

      // Verify changes
      cy.get('[data-canvas]').contains('First Name').should('be.visible');
    });

    it('should delete a field', () => {
      // Add field
      cy.get('[data-field-type="string"]').click();

      // Delete field
      cy.get('[data-canvas] [data-field]:first').click();
      cy.get('[data-action="delete-field"]').click();

      // Verify field is gone
      cy.get('[data-canvas] [data-field]').should('not.exist');
    });

    it('should duplicate a field', () => {
      // Add field
      cy.get('[data-field-type="string"]').click();

      // Duplicate field
      cy.get('[data-canvas] [data-field]:first').click();
      cy.get('[data-action="duplicate-field"]').click();

      // Verify two fields exist
      cy.get('[data-canvas] [data-field]').should('have.length', 2);
    });
  });

  describe('Groups', () => {
    it('should create a field group', () => {
      cy.get('[data-action="add-group"]').click();
      cy.get('[data-group-name-input]').type('Personal Information');
      cy.get('[data-action="save-group"]').click();

      // Verify group exists
      cy.get('[data-group]').contains('Personal Information').should('be.visible');
    });

    it('should add fields to a group', () => {
      // Create group
      cy.get('[data-action="add-group"]').click();
      cy.get('[data-group-name-input]').type('Contact Info');
      cy.get('[data-action="save-group"]').click();

      // Add field to group
      cy.get('[data-field-type="email"]').click();

      // Assign to group (this depends on UI implementation)
      cy.get('[data-canvas] [data-field]:first').click();
      cy.get('[data-config="groupId"]').select('Contact Info');

      // Verify field is in group
      cy.get('[data-group="Contact Info"]').within(() => {
        cy.get('[data-field]').should('have.length', 1);
      });
    });
  });

  describe('Undo/Redo', () => {
    it('should undo field addition', () => {
      // Add field
      cy.get('[data-field-type="string"]').click();
      cy.get('[data-canvas] [data-field]').should('have.length', 1);

      // Undo
      cy.get('[data-action="undo"]').click();
      cy.get('[data-canvas] [data-field]').should('have.length', 0);
    });

    it('should redo field addition', () => {
      // Add and undo
      cy.get('[data-field-type="string"]').click();
      cy.get('[data-action="undo"]').click();

      // Redo
      cy.get('[data-action="redo"]').click();
      cy.get('[data-canvas] [data-field]').should('have.length', 1);
    });
  });

  describe('Preview', () => {
    it('should show form preview', () => {
      // Add some fields
      cy.get('[data-field-type="string"]').click();
      cy.get('[data-field-type="email"]').click();

      // Switch to preview
      cy.get('[data-tab="preview"]').click();

      // Verify preview is visible
      cy.get('[data-preview]').should('be.visible');
      cy.get('[data-preview] input').should('have.length.at.least', 2);
    });

    it('should validate required fields in preview', () => {
      // Add required field
      cy.get('[data-field-type="string"]').click();
      cy.get('[data-canvas] [data-field]:first').click();
      cy.get('[data-config="required"]').check();

      // Go to preview and submit
      cy.get('[data-tab="preview"]').click();
      cy.get('[data-action="submit-preview"]').click();

      // Verify validation error
      cy.contains('required').should('be.visible');
    });
  });

  describe('Export', () => {
    it('should export form as JSON', () => {
      // Add fields
      cy.get('[data-field-type="string"]').click();
      cy.get('[data-field-type="email"]').click();

      // Export
      cy.get('[data-tab="export"]').click();
      cy.get('[data-export-format="json"]').click();

      // Verify JSON is displayed
      cy.get('[data-code-output]').should('contain', 'fields');
    });

    it('should export form as TypeScript', () => {
      // Add fields
      cy.get('[data-field-type="string"]').click();

      // Export
      cy.get('[data-tab="export"]').click();
      cy.get('[data-export-format="typescript"]').click();

      // Verify TypeScript code is displayed
      cy.get('[data-code-output]').should('contain', 'FormSchema');
      cy.get('[data-code-output]').should('contain', 'import');
    });
  });

  describe('Templates', () => {
    it('should load a template', () => {
      // Load template
      cy.get('[data-action="load-template"]').click();
      cy.get('[data-template="contact-form"]').click();

      // Verify fields are loaded
      cy.get('[data-canvas] [data-field]').should('have.length.at.least', 3);
    });
  });

  describe('Cross-Field Validators', () => {
    it('should add a fieldsMatch validator', () => {
      // Add two password fields
      cy.get('[data-field-type="password"]').click();
      cy.get('[data-field-type="password"]').click();

      // Add cross validator
      cy.get('[data-action="add-cross-validator"]').click();
      cy.get('[data-validator-type]').select('fieldsMatch');
      cy.get('[data-validator-field-1]').select('password');
      cy.get('[data-validator-field-2]').select('confirmPassword');
      cy.get('[data-action="save-validator"]').click();

      // Verify validator is added
      cy.get('[data-cross-validator]').should('have.length', 1);
    });
  });

  describe('Theme', () => {
    it('should toggle dark/light theme', () => {
      // Toggle theme
      cy.get('[data-action="toggle-theme"]').click();

      // Verify dark theme is active
      cy.get('body').should('have.class', 'dark-theme');

      // Toggle back
      cy.get('[data-action="toggle-theme"]').click();
      cy.get('body').should('have.class', 'light-theme');
    });
  });

  describe('Language', () => {
    it('should toggle Turkish/English language', () => {
      // Check current language
      cy.get('[data-current-lang]').should('contain', 'TR');

      // Toggle language
      cy.get('[data-action="toggle-language"]').click();

      // Verify language changed
      cy.get('[data-current-lang]').should('contain', 'EN');
    });
  });
});
