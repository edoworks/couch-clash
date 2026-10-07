import XCTest

@MainActor
final class CouchClashUITests: XCTestCase {
    let app = XCUIApplication()
    func button(_ prefix: String) -> XCUIElement {
        app.webViews.descendants(matching: .any).matching(NSPredicate(format: "(elementType == %d OR elementType == %d) AND label BEGINSWITH %@", XCUIElement.ElementType.button.rawValue, XCUIElement.ElementType.switch.rawValue, prefix)).firstMatch
    }
    func tap(_ prefix: String) {
        let b = button(prefix)
        XCTAssertTrue(b.waitForExistence(timeout: 10), "Missing button: \(prefix)")
        for _ in 0..<12 { if b.isHittable { break }; if b.frame.minY < 0 { app.swipeDown() } else { app.swipeUp() } }
        b.tap()
    }
    func capture(_ name: String) {
        let image = XCTAttachment(screenshot: app.screenshot()); image.name = name; image.lifetime = .keepAlways; add(image)
    }
    func link(_ text: String) {
        let l = app.webViews.links.matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
        XCTAssertTrue(l.waitForExistence(timeout: 10))
        for _ in 0..<15 { if l.isHittable { break }; app.swipeUp() }
        l.tap()
        if text == "Try the fictional demo" { XCTAssertTrue(app.webViews.staticTexts["ATL at NO · October 5, 2026"].waitForExistence(timeout: 10)) }
    }
    func testNativeUpgradeReadOnly() {
        continueAfterFailure = false
        app.launch()
        link("Review October 4 app saves")
        XCTAssertTrue(button("Open read-only record").waitForExistence(timeout: 10))
        tap("Open read-only record")
        XCTAssertTrue(app.webViews.staticTexts["Pregame locked · Halftime not locked"].exists)
        XCTAssertFalse(app.webViews.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Pick: Chargers")).firstMatch.exists)
        tap("I’m Player 1")
        XCTAssertTrue(app.webViews.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Pick: Chargers")).firstMatch.exists)
        capture("native-mnf-old-locked-record")
        app.terminate();app.launch()
        link("Review October 4 app saves");tap("Open read-only record")
        XCTAssertFalse(app.webViews.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Pick: Chargers")).firstMatch.exists)
        tap("I’m Player 2")
        XCTAssertTrue(app.webViews.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Pick: Seahawks")).firstMatch.exists)
        capture("native-mnf-old-draft-record")
        tap("← All October 4 records")
        let records=app.webViews.buttons.matching(NSPredicate(format: "label == %@", "Open read-only record"))
        let last=records.element(boundBy: 1)
        for _ in 0..<10 { if last.isHittable {break};app.swipeUp() }; last.tap()
        XCTAssertTrue(app.webViews.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Shared winner")).firstMatch.exists)
        capture("native-mnf-old-final-record")
        app.terminate()
    }

    func testBundledGamePersistsAndCompletes() {
        continueAfterFailure = false
        app.launch(); link("Try the fictional demo"); if button("Back to setup").exists { tap("Back to setup") }
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 15))
        if button("Resume saved match").exists { tap("Resume saved match") }
        if button("Reset current match").exists {
            tap("Reset current match"); XCTAssertTrue(app.alerts["Confirm local change"].waitForExistence(timeout: 15)); app.alerts.buttons["Continue"].tap()
        }
        XCTAssertTrue(button("Start the demo").waitForExistence(timeout: 15))
        // Upgrade preservation is verified separately before this fresh-game regression.
        tap("Theme & local saves"); tap("Saved games on this device"); tap("Erase MNF data only")
        XCTAssertTrue(app.alerts["Confirm local change"].waitForExistence(timeout: 5))
        app.alerts.buttons["Continue"].tap()
        XCTAssertTrue(button("Start the demo").waitForExistence(timeout: 5))
        capture("native-lobby")
        tap("Remove last")
        tap("Start the demo")
        capture("native-handoff")
        tap("That’s me")
        XCTAssertFalse(button("Lock 3 calls").isEnabled)
        tap("Falcons"); tap("Field goal"); tap("Tie")
        capture("native-picks")
        tap("Theme & local saves")
        if !button("✓ Chargers colors").exists { tap("Chargers colors") }
        XCTAssertTrue(button("✓ Chargers colors").exists)
        tap("Save & leave")
        capture("native-local-saved")
        app.terminate(); app.launch(); link("Try the fictional demo"); if button("Back to setup").exists { tap("Back to setup") }
        XCTAssertTrue(button("Resume saved match").waitForExistence(timeout: 15))
        tap("Resume saved match")
        tap("That’s me")
        tap("Theme & local saves")
        XCTAssertTrue(button("✓ Chargers colors").exists)
        XCTAssertTrue(button("Lock 3 calls").isEnabled)
        capture("native-chargers-restored")
        tap("Lock 3 calls")
        app.terminate(); app.launch(); link("Try the fictional demo"); if button("Back to setup").exists { tap("Back to setup") }
        XCTAssertTrue(button("That’s me").waitForExistence(timeout: 15))
        tap("That’s me")
        for _ in 0..<3 { tap("Skip this call") }
        tap("Lock 3 calls")
        capture("native-prediction-board")
        XCTAssertTrue(app.webViews.staticTexts["0 resolved · 0 voided · 5 awaiting results"].exists)
        tap("Advance demo")
        tap("Review outcomes"); tap("Confirm outcomes")
        capture("native-halftime")
        tap("View prediction board")
        XCTAssertTrue(app.webViews.staticTexts["2 resolved · 0 voided · 3 awaiting results"].exists)
        XCTAssertTrue(app.webViews.staticTexts["Winner choices stay concealed until final confirmation."].exists)
        capture("native-halftime-board")
        tap("Back to private handoff")
        for _ in 1...2 {
            tap("That’s me")
            tap("Saints"); tap("21–35"); tap("Lock 2 calls")
        }
        tap("Advance demo")
        tap("Review outcomes"); tap("Confirm outcomes")
        capture("native-final-recap")
        XCTAssertTrue(app.webViews.staticTexts["5 resolved · 0 voided · 0 awaiting results"].exists)
        XCTAssertTrue(app.webViews.staticTexts["Winner"].exists)
        XCTAssertTrue(app.webViews.staticTexts["Finished"].exists)
        tap("Save final game")
        XCTAssertTrue(button("Saved to local history").exists)
        XCTAssertTrue(button("Run it back").exists)
        app.terminate(); app.launch(); link("Try the fictional demo"); if button("Back to setup").exists { tap("Back to setup") }
        XCTAssertTrue(button("Run it back").waitForExistence(timeout: 15))
        tap("Run it back"); XCTAssertTrue(app.alerts["Confirm local change"].waitForExistence(timeout: 5))
        app.alerts.buttons["Cancel"].tap()
        XCTAssertTrue(button("Run it back").exists)
        tap("Run it back"); app.alerts.buttons["Continue"].tap()
        XCTAssertTrue(button("Start the demo").waitForExistence(timeout: 5))
        tap("Theme & local saves")
        tap("Saved games on this device")
        XCTAssertTrue(button("Open saved recap").exists)
        tap("Open saved recap")
        capture("native-saved-history")
        XCTAssertFalse(button("Run it back").exists)
        XCTAssertTrue(app.webViews.staticTexts["Winner"].exists)
        tap("← Back to local games")
        tap("Delete this saved game")
        app.alerts.buttons["Cancel"].tap()
        XCTAssertTrue(button("Open saved recap").exists)
        tap("Delete this saved game")
        app.alerts.buttons["Continue"].tap()
        XCTAssertFalse(button("Open saved recap").exists)
        tap("Erase MNF data only")
        app.alerts.buttons["Cancel"].tap()
        tap("Erase MNF data only")
        app.alerts.buttons["Continue"].tap()
        XCTAssertTrue(button("Start the demo").waitForExistence(timeout: 5))
        app.terminate(); app.launch(); link("Try the fictional demo"); if button("Back to setup").exists { tap("Back to setup") }
        XCTAssertTrue(button("Start the demo").waitForExistence(timeout: 15))
        tap("Theme & local saves")
        XCTAssertTrue(button("✓ Default").exists)
    }
    func testHomeScreenIconAndScheduleLink() {
        continueAfterFailure = false
        app.launch(); link("Try the fictional demo"); if button("Back to setup").exists { tap("Back to setup") }
        XCTAssertTrue(button("Start the demo").waitForExistence(timeout: 15))
        let link = app.webViews.links.matching(NSPredicate(format: "label CONTAINS %@", "Schedule source")).firstMatch
        XCTAssertTrue(link.waitForExistence(timeout: 10))
        for _ in 0..<6 { if link.isHittable { break }; app.swipeUp() }
        link.tap()
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 15), "Verified schedule opens in system browser")
        app.activate()
        XCTAssertTrue(button("Start the demo").waitForExistence(timeout: 10))
        XCUIDevice.shared.press(.home)
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let icon = springboard.icons["Couch Clash"]
        XCTAssertTrue(icon.waitForExistence(timeout: 10))
        let shot = XCTAttachment(screenshot: springboard.screenshot())
        shot.name = "native-installed-icon"; shot.lifetime = .keepAlways; add(shot)
    }



}
