Feature: Chat history search

  Scenario: Search filters conversations by text
    Given I am logged in as "test@test.com" with password "12345678"
    And I open the new chat page
    And I seed multiple conversations for search
    When I search conversation history for "internship"
    Then I should see a conversation matching "internship"

  Scenario: Search with no matches shows empty state
    Given I am logged in as "test@test.com" with password "12345678"
    And I open the new chat page
    And I seed multiple conversations for search
    When I search conversation history for "zzzznomatch"
    Then I should see a no matching conversations message
