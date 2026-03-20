Feature: Chat

Scenario: Sending a prompt to the AI
  Given I am logged in as "user@example.com" with password "ValidPass123!"
  And I am on the AI chat page
  When I type a message into the chat input field
  And I submit the message
  Then my message should be displayed in the chat history
  And an AI response should be returned in the chat

Scenario: Logged-in user can log out to landing page
  Given I am logged in as "user@example.com" with password "ValidPass123!"
  And I am on the AI chat page
  When I log out
  Then I should be on the landing page