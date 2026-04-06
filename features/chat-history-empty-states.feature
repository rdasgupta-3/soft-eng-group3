Feature: Active conversation selection

  Scenario: Active conversation remains selected after refresh
    Given I am logged in as "test@test.com" with password "123456"
    And I open the new chat page
    And I seed two distinct conversations
    When I switch to the second conversation
    And I refresh the browser
    Then the second conversation should still be active

  Scenario: Switching conversations updates the displayed messages
    Given I am logged in as "test@test.com" with password "123456"
    And I open the new chat page
    And I seed two distinct conversations
    When I switch to the second conversation
    Then I should see "second thread unique text" in the chat area
    When I switch back to the first conversation
    Then I should see "first thread unique text" in the chat area