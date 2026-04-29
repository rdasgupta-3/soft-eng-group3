Feature: Practical personality assistant

  Scenario: Mr. Professional solves equations with the selected backend models
    Given I am logged in as "test@test.com" with password "123456"
    And I open the practical assistant as "professional"
    When I ask an equation question in the current conversation
    Then the practical assistant should show an equation answer

  Scenario: Lord Silly the Ninth predicts weather
    Given I am logged in as "test@test.com" with password "123456"
    And I open the practical assistant as "silly"
    When I ask a weather question in the current conversation
    Then the practical assistant should show a weather prediction

  Scenario: Lord Silly the Ninth gives uncertainty-aware reconstructed weather trends
    Given I am logged in as "test@test.com" with password "123456"
    And I open the practical assistant as "silly"
    And I selected a backend model
    When I ask "Will it rain exactly at 7:13 PM in Piscataway?"
    Then the assistant should provide a playful uncertainty-aware weather response
    And the response should mention a general trend rather than claiming exact certainty

  Scenario: User can read an assistant response aloud
    Given I am logged in as "test@test.com" with password "123456"
    And I open the practical assistant as "sweetheart"
    When I ask "What is artificial intelligence?"
    And the assistant responds
    Then I should see a Read Aloud button for the assistant response
