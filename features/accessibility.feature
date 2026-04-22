Feature: Accessibility formatting controls

Scenario: Toggling bold text in the chat interface
    Given I am logged in
    And I am on the chat page
    And there is a message in the chat
    When I click the "Bold" button
    Then all chat messages should appear in bold

Scenario: Increasing text size
    Given I am logged in
    And I am on the chat page
    And there is a message in the chat
    When I click the "A+" button
    Then the text size should increase 

Scenario: Decreasing text size
    Given I am logged in
    And I am on the chat page
    And there is a message in the chat
    And I have increased the text size
    When I click "A-"
    Then the text size should decrease

Scenario: Formatting persists after sending a message
    Given I am logged in 
    And I am on the chat page
    And I enabled bold text
    And I increased the text size
    When I send a message "Hello"
    Then the message should appear with bold formatting
    And the message should appear with the increased text size