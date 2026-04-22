Feature: Accessibility controls
  As a visually impaired user
  So that I can read prompts and responses more clearly
  I want to adjust text size, enable bold text, and enable high contrast mode

  Scenario: A logged-in user increases and decreases text size
    Given I have a registered solo iteration account
    And I am logged in on the chat page with the "professional" persona
    When I increase the text size 2 times
    And I decrease the text size 1 time
    And I send the prompt "Explain why automated testing matters"
    Then the text size indicator should show "110%"
    And the prompt composer should use a larger font size
    And the latest response cards should use a larger font size

  Scenario: A logged-in user enables bold text and high contrast mode
    Given I have a registered solo iteration account
    And I am logged in on the chat page with the "professional" persona
    When I enable bold text
    And I enable high contrast mode
    And I send the prompt "Summarize the benefits of readable interfaces"
    Then the prompt composer should use bold text
    And the latest response cards should use bold text
    And the workspace should use high contrast mode
