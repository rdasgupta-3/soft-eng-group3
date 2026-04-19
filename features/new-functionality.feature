Feature: New functionality – persona badges, accessibility settings, multi-model selector, and password reset

  # ─── Persona badge ──────────────────────────────────────────────────────────

  Scenario: Selecting a persona shows its badge in the chat header
    Given I am logged in as "user@example.com" with password "Px2@vNw7mQzK!"
    When I open the chat page with persona "sweetheart"
    Then I should see a persona badge in the chat header containing "Miss Sweetheart"

  Scenario: Visiting chat without a persona shows no badge
    Given I am logged in as "user@example.com" with password "Px2@vNw7mQzK!"
    When I open the chat page with no persona
    Then I should not see a persona badge in the chat header

  # ─── Accessibility settings panel ───────────────────────────────────────────

  Scenario: Opening the settings panel
    Given I am logged in as "user@example.com" with password "Px2@vNw7mQzK!"
    And I am on the AI chat page
    When I click the Accessibility button
    Then the settings panel should be visible

  Scenario: Closing the settings panel
    Given I am logged in as "user@example.com" with password "Px2@vNw7mQzK!"
    And I am on the AI chat page
    When I click the Accessibility button
    And I click the Close button in the settings panel
    Then the settings panel should be hidden

  Scenario: Enabling large font size applies the style to the page
    Given I am logged in as "user@example.com" with password "Px2@vNw7mQzK!"
    And I am on the AI chat page
    When I click the Accessibility button
    And I select the "large" font size option
    Then the page body should have the large font class

  # ─── Multi-model selector ───────────────────────────────────────────────────

  Scenario: Model selector is visible when Ollama is reachable
    Given I am logged in as "user@example.com" with password "Px2@vNw7mQzK!"
    And I am on the AI chat page
    Then the model selector strip should be visible
    And at least one model checkbox should be pre-checked

  Scenario: Unchecking the only selected model re-checks it automatically
    Given I am logged in as "user@example.com" with password "Px2@vNw7mQzK!"
    And I am on the AI chat page
    When I uncheck the only checked model checkbox
    Then at least one model checkbox should be pre-checked

  # ─── Password reset happy path ───────────────────────────────────────────────

  Scenario: Requesting a password reset shows a success message
    Given I open a fresh browser session
    And I open the forgot password page
    When I enter "user@example.com" into the forgot password email field
    And I submit the forgot password form
    Then I should see a forgot password success message

  Scenario: Visiting the reset page without a token shows an error
    Given I open a fresh browser session
    And I open the reset password page with token ""
    When I submit the reset password form
    Then I should see a reset token error message
