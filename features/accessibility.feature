Feature: Accessibility formatting controls

Scenario: Toggling bold text in the chat interface
    Given I am logged in
    And I am on the chat page
    When I click the "Bold" button
    Then all chat messages and input text should appear in bold

Scenario: Increasing text size in the chat interface
    Given I am logged in
    And I am on the chat page
    When I click the "Increase Text Size" button
    Then the chat text size should increase by at least one step

Scenario: Formatting persists after sending a message
    Given I enabled bold text
    And I increased the text size
    When I send a message "Hello"
    Then the message should appear with bold formatting
    And the message should appear with the increased text size