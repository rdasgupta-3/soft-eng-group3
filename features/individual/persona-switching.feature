Feature: Persona switching
  As a user
  So that I can change the tone of my chat
  I want a newly selected persona to update the active workspace clearly

  Scenario: A logged-in user changes from Mr. Professional to Miss Sweetheart
    Given I have a registered solo iteration account
    And I am logged in on the chat page with the "professional" persona
    When I open the change persona page
    And I choose the "sweetheart" persona
    Then the chat workspace should show the "Miss Sweetheart" persona
    And the URL should include "persona=sweetheart"
    When I send the prompt "Give me a kind productivity tip"
    Then the latest response cards should mention "Miss Sweetheart"
