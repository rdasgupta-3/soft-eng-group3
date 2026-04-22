Feature: Conversation history
  As a user
  So that I can keep working across sessions
  I want to save, search, star, and delete conversations

  Scenario: A user manages conversation history from the sidebar
    Given I have a registered solo iteration account
    And I am logged in on the chat page with the "silly" persona
    When I send the prompt "First planning note"
    And I create a new chat
    And I send the prompt "Second planning note"
    And I pin the conversation titled "First planning note"
    Then the conversation titled "First planning note" should show a filled star icon
    And I search conversation history for "Second planning note"
    Then I should only see the conversation titled "Second planning note"
    When I clear the conversation history search
    And I open the conversation titled "First planning note"
    Then I should see the user message "First planning note" in the chat window
    When I delete the conversation titled "Second planning note"
    Then I should see the conversation titled "First planning note"

  Scenario: A starred conversation persists after logout and login
    Given I have a registered solo iteration account
    And I am logged in on the chat page with the "professional" persona
    When I send the prompt "Pinned study note"
    And I pin the conversation titled "Pinned study note"
    Then the conversation titled "Pinned study note" should show a filled star icon
    When I log out from the chat workspace
    And I log back in with my existing account
    And I choose the "sweetheart" persona from the selection page
    Then I should see the conversation titled "Pinned study note"
    And the conversation titled "Pinned study note" should appear in the starred section
    When I open the conversation titled "Pinned study note"
    Then I should see the user message "Pinned study note" in the chat window
