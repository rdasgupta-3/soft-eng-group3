Feature: Select AI Model

Scenario: AI model selector shows multiple options and allows exactly one choice
  Given I am on the AI model selector page as an authenticated user
  Then I should see at least 3 model options
  And each model option should have a name and avatar
  When I select the model "Miss Sweetheart"
  Then exactly one model should be selected
  And the selected model should be saved
  And I can continue to the AI chat page


