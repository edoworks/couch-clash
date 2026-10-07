import XCTest

@MainActor
final class NativeParityTests: XCTestCase {
    let app = XCUIApplication()
    func label(_ value: String) -> XCUIElement { app.webViews.staticTexts.matching(NSPredicate(format:"label CONTAINS %@",value)).firstMatch }
    func button(_ value: String) -> XCUIElement { app.webViews.descendants(matching:.any).matching(NSPredicate(format:"(elementType == %d OR elementType == %d) AND label BEGINSWITH %@",XCUIElement.ElementType.button.rawValue,XCUIElement.ElementType.switch.rawValue,value)).firstMatch }
    func tap(_ value: String) { let b=button(value);XCTAssertTrue(b.waitForExistence(timeout:15),value);for _ in 0..<20 {if b.isHittable {break};if b.frame.minY<0 {app.swipeDown()} else {app.swipeUp()}};b.tap() }
    func link(_ value: String) {let l=app.webViews.links.matching(NSPredicate(format:"label CONTAINS %@",value)).firstMatch;XCTAssertTrue(l.waitForExistence(timeout:15));for _ in 0..<20 {if l.isHittable {break};app.swipeUp()};l.tap()}
    func shot(_ name:String){let a=XCTAttachment(screenshot:app.screenshot());a.name=name;a.lifetime = .keepAlways;add(a)}
    func testRealScoresThenFailureAndManualEntry() {
        continueAfterFailure=false
        app.launchArguments=["--score-test-fail-after-first"]
        app.launch()
        XCTAssertTrue(label("Scores · BALLDONTLIE").waitForExistence(timeout:20))
        XCTAssertTrue(label("Provisional provider scores.").exists)
        XCTAssertTrue(label("Your host still confirms prediction outcomes.").exists)
        shot("native-real-scores")
        tap("Refresh scores")
        XCTAssertTrue(label("Saved scores · BALLDONTLIE · stale").waitForExistence(timeout:15))
        shot("native-stale-scores")
        app.terminate();app.launchArguments=["--score-test-unavailable"];app.launch()
        XCTAssertTrue(label("Scores unavailable").waitForExistence(timeout:15))
        shot("native-unavailable-scores")
        link("Host another football game")
        XCTAssertTrue(label("Set the matchup.").waitForExistence(timeout:10))
        shot("native-manual-setup")
    }
    func testBridgeRejectsUntrustedCallsAndFileOrigin() {
        continueAfterFailure=false
        app.launchArguments=["--score-test-bridge-probe"]
        app.launch()
        XCTAssertTrue(label("Positive control reached deterministic transport").waitForExistence(timeout:15))
        XCTAssertTrue(label("Payload rejected before transport").waitForExistence(timeout:15))
        XCTAssertTrue(label("Subframe rejected before transport").waitForExistence(timeout:15))
        XCTAssertTrue(label("Direct file-origin fetch blocked").waitForExistence(timeout:15))
        shot("native-bridge-negative-probe")
        link("Host another football game")
        XCTAssertTrue(label("Other main document rejected before transport").waitForExistence(timeout:15))
        app.terminate()
    }
    func testManualGameWithScoresUnavailable() {
        continueAfterFailure=false
        app.launchArguments=["--score-test-unavailable"]
        app.launch();link("Host another football game")
        XCTAssertTrue(label("Set the matchup.").waitForExistence(timeout:10))
        tap("Remove last");tap("Try a quick demo");tap("Start the fictional demo")
        for _ in 0..<2 {tap("That’s me");for _ in 0..<3 {tap("Skip this call")};tap("Lock 3 calls")}
        tap("Advance demo");tap("Review outcomes");tap("Confirm outcomes")
        app.terminate();app.launch();link("Host another football game")
        if button("Resume saved match").exists {tap("Resume saved match")}
        for _ in 0..<2 {tap("That’s me");for _ in 0..<2 {tap("Skip this call")};tap("Lock 2 calls")}
        tap("Advance demo");tap("Review outcomes");tap("Confirm outcomes")
        XCTAssertTrue(label("Shared winner").exists)
        XCTAssertTrue(label("5 resolved").exists)
        shot("native-manual-shared-podium")
        tap("Save final game");XCTAssertTrue(button("Saved to local history").exists)
        app.terminate();app.launch();link("Host another football game")
        XCTAssertTrue(label("Shared winner").waitForExistence(timeout:10))
        shot("native-manual-restored-podium")
        app.terminate()
    }
    func testHostTeamInputsAndCloseCards() {
        continueAfterFailure=false
        app.launchArguments=["--score-test-unavailable"]
        app.launch();link("Host another football game")
        if button("Run it back").exists {tap("Run it back");app.alerts.buttons["Continue"].tap()}
        XCTAssertTrue(label("Set the matchup.").waitForExistence(timeout:10))
        for _ in 0..<8 {app.swipeDown()}
        let away=app.webViews.textFields["Away team"]
        let home=app.webViews.textFields["Home team"]
        XCTAssertTrue(away.exists);XCTAssertTrue(home.exists)
        for (field,text) in [(away,"Cedar"),(home,"Harbor")] {
            field.tap();field.press(forDuration:1.2)
            XCTAssertTrue(app.menuItems["Select All"].waitForExistence(timeout:5));app.menuItems["Select All"].tap();field.typeText(text)
            XCTAssertEqual(field.value as? String,text)
        }
        if app.toolbars.buttons["Done"].exists {app.toolbars.buttons["Done"].tap()}
        tap("Remove last");tap("Host this game")
        XCTAssertFalse(button("Start our manual match").isEnabled)
        tap("This game has not started")
        shot("native-host-ready")
        tap("Start our manual match")
        XCTAssertTrue(label("Cedar at Harbor").exists)
        tap("That’s me");tap("Cedar");tap("Field goal");tap("Tie");tap("Lock 3 calls")
        tap("Host: play started")
        if app.alerts["Confirm local change"].waitForExistence(timeout:3) {app.alerts.buttons["Continue"].tap()}
        XCTAssertTrue(label("0 resolved").exists)
        app.terminate();app.launch();link("Host another football game")
        XCTAssertTrue(label("Cedar at Harbor").waitForExistence(timeout:10))
        XCTAssertFalse(button("Lock 3 calls").exists)
        shot("native-host-closed-restored")
        app.terminate()
    }
    func testNavigationCancelsDelayedScoresAndRetries() {
        continueAfterFailure=false
        app.launchArguments=["--score-test-lifecycle"]
        app.launch()
        XCTAssertTrue(label("Delayed request active").waitForExistence(timeout:15))
        link("Host another football game")
        if button("Back to setup").exists {tap("Back to setup")}
        // Reset only the synthetic current match left by the preceding full-game test; history stays.
        if button("Run it back").exists { tap("Run it back"); app.alerts.buttons["Continue"].tap() }
        XCTAssertTrue(label("Set the matchup.").waitForExistence(timeout:10))
        link("Back to game picker")
        XCTAssertTrue(label("Returned home recovered after cancellation").waitForExistence(timeout:15))
        XCTAssertTrue(label("Test scores").exists)
        tap("Refresh scores")
        XCTAssertTrue(label("Test scores").exists)
        XCTAssertTrue(button("Refresh scores").isEnabled)
        shot("native-navigation-score-recovery")
        app.terminate()
    }
    func testEraseWarningIdentifiesNativeStore() {
        continueAfterFailure=false
        app.launchArguments=["--score-test-unavailable"]
        app.launch();link("Host another football game")
        tap("Theme & local saves");tap("Saved games on this device");tap("Erase host-defined data only")
        XCTAssertTrue(app.alerts["Confirm local change"].waitForExistence(timeout:5))
        let text=app.alerts.staticTexts.allElementsBoundByIndex.map { $0.label }.joined(separator:" ")
        XCTAssertTrue(text.contains("October 4 legacy app saves and October 5 official app saves are not affected"))
        XCTAssertFalse(text.contains("native-app saves"))
        app.alerts.buttons["Cancel"].tap();app.terminate()
    }
    func testSeedBuild4OfficialSave() {
        continueAfterFailure=false
        app.launch();link("Try the fictional demo")
        if button("Back to setup").exists {tap("Back to setup")}
        tap("Start the demo");tap("That’s me");tap("Falcons");tap("Field goal");tap("Tie");tap("Lock 3 calls")
        shot("build4-official-locked-synthetic")
        app.terminate()
    }
}
