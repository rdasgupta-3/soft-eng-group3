Feature: Chat history management

  Scenario: Creating a new conversation keeps prior conversations
    Given I am logged in as "test@test.com" with password "Xk9#mQvT3p@L"
    And I open the new chat page
    And I seed a first conversation
    When I click the new conversation button
    Then I should still see the prior conversation entry

  Scenario: User can pin a conversation
    Given I am logged in as "test@test.com" with password "Xk9#mQvT3p@L"
    And I open the new chat page
    And I seed a first conversation
    When I pin the first conversation
    Then the first conversation should appear pinned

  Scenario: User can delete a conversation
    Given I am logged in as "test@test.com" with password "Xk9#mQvT3p@L"
    And I open the new chat page
    And I seed a first conversation
    When I delete the first conversation
    Then the deleted conversation should no longer appear