Feature: AI Personality Switcher
  As a user interacting with Triad.ai
  I want to be able to switch the AI's personality
  So that I can get answers in different tones

Scenario: Toggling through personalities
    Given I am logged in as "test@test.com" with password "123456"
    And I am on the Triad.ai chat interface
    When I click the "Switch Personality" button
    Then the displayed personality name should change to the next catalog option