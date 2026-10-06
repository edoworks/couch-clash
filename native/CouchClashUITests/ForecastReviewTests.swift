import XCTest

@MainActor final class ForecastReviewTests: XCTestCase {
    let app = XCUIApplication()
    func label(_ value: String) -> XCUIElement { app.webViews.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", value)).firstMatch }
    func open(_ flags: [String] = []) {
        app.launchArguments = ["--score-test-unavailable", "--forecast-qa"] + flags
        app.launch(); app.buttons["OpenForecastReview"].tap()
        XCTAssertTrue(label("Keep the thought.").waitForExistence(timeout: 15))
    }
    func shot(_ name: String) { let a = XCTAttachment(screenshot: app.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a) }
    func tap(_ name: String) {
        let el = app.webViews.buttons[name]
        XCTAssertTrue(el.waitForExistence(timeout: 10))
        for _ in 0..<25 { if el.isHittable { break }; if el.frame.minY < 0 { app.swipeDown() } else { app.swipeUp() } }
        el.tap()
    }
    func testAccessibilityAudit() throws {
        open()
        try app.performAccessibilityAudit(for: [.contrast, .elementDetection, .sufficientElementDescription])
        shot("forecast-accessibility-audit")
        app.terminate()
    }
    func testNativeBridgeAndDurableRelaunch() {
        continueAfterFailure = false
        open(["--forecast-probe", "--forecast-fake"])
        XCTAssertTrue(label("Forecast native probe PASS 15").waitForExistence(timeout: 20), app.debugDescription)
        shot("forecast-native-probe")
        app.terminate(); open()
        XCTAssertTrue(label("Synthetic QA original").exists)
        XCTAssertTrue(label("Synthetic QA revision").exists)
        XCTAssertTrue(label("Original Brier: 0.6400").exists)
        XCTAssertFalse(app.webViews.buttons["Save before commentary"].isEnabled)
        shot("forecast-durable-relaunch")
        tap("Ask on-device model")
        XCTAssertTrue(label("Deterministic fallback").waitForExistence(timeout: 25))
        shot("forecast-simulator-unavailable-fallback")
        tap("Export journal JSON")
        XCTAssertTrue(app.textFields["DOCPicker.filenameTextField"].waitForExistence(timeout: 10))
        shot("forecast-native-export-picker")
        app.buttons["Save"].tap()
        XCTAssertTrue(label("Exported journal JSON").waitForExistence(timeout: 15))
        tap("Export journal JSON")
        XCTAssertTrue(app.textFields["DOCPicker.filenameTextField"].waitForExistence(timeout: 10))
        let top = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.09))
        top.press(forDuration: 0.2, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.95)))
        XCTAssertTrue(label("Export cancelled").waitForExistence(timeout: 10))
        app.buttons["Done"].tap()
        XCTAssertTrue(app.buttons["OpenForecastReview"].exists)
        app.buttons["OpenForecastReview"].tap()
        XCTAssertTrue(label("Original Brier: 0.6400").waitForExistence(timeout: 10))
        app.terminate()
    }
    func testZDeleteIsDurableAndScoped() {
        continueAfterFailure = false
        open()
        let checkbox = label("Delete only this forecast journal")
        for _ in 0..<25 { if checkbox.isHittable { break }; app.swipeUp() }
        checkbox.tap(); tap("Delete journal")
        XCTAssertTrue(label("Forecast journal deleted from this app").waitForExistence(timeout: 10))
        app.terminate(); open()
        XCTAssertTrue(label("No forecast yet").waitForExistence(timeout: 10))
        XCTAssertFalse(app.webViews.buttons["Ask on-device model"].isEnabled)
        shot("forecast-deleted-relaunch"); app.terminate()
    }

    func testProductionStoreSaveReloadAndDelete() {
        continueAfterFailure = false
        // No QA-store flag: exercise the actual stable journal UUID, with no model calls.
        func launchRealStore() {
            app.launchArguments = ["--score-test-unavailable"]
            app.launch(); app.buttons["OpenForecastReview"].tap()
            XCTAssertTrue(label("Keep the thought.").waitForExistence(timeout: 15))
        }
        launchRealStore()
        XCTAssertTrue(label("No forecast yet").exists, "Refuse to alter an existing journal")
        let field = app.webViews.textFields.firstMatch
        for _ in 0..<15 { if field.isHittable { break }; app.swipeUp() }
        field.tap(); field.typeText("73")
        if app.toolbars.buttons["Done"].exists { app.toolbars.buttons["Done"].tap() }
        tap("Save before commentary")
        XCTAssertTrue(label("Original · 73% Yes").waitForExistence(timeout: 10))
        app.terminate(); launchRealStore()
        XCTAssertTrue(label("Original · 73% Yes").waitForExistence(timeout: 10))
        shot("forecast-production-store-relaunch")
        let checkbox = label("Delete only this forecast journal")
        for _ in 0..<25 { if checkbox.isHittable { break }; app.swipeUp() }
        checkbox.tap(); tap("Delete journal")
        XCTAssertTrue(label("Forecast journal deleted from this app").waitForExistence(timeout: 10))
        app.terminate(); launchRealStore()
        XCTAssertTrue(label("No forecast yet").waitForExistence(timeout: 10)); app.terminate()
    }

    func testProbeSafetySeedProductionRecord() {
        continueAfterFailure = false
        app.launchArguments = ["--score-test-unavailable"]
        app.launch(); app.buttons["OpenForecastReview"].tap()
        XCTAssertTrue(label("No forecast yet").waitForExistence(timeout: 15), "Refuse to overwrite an existing journal")
        let field = app.webViews.textFields.firstMatch
        for _ in 0..<15 { if field.isHittable { break }; app.swipeUp() }
        field.tap(); field.typeText("73")
        if app.toolbars.buttons["Done"].exists { app.toolbars.buttons["Done"].tap() }
        tap("Save before commentary")
        XCTAssertTrue(label("Original · 73% Yes").waitForExistence(timeout: 10))
        app.terminate()
    }
    func testProbeOnlyLaunchPreservesProductionRecord() {
        continueAfterFailure = false
        app.launchArguments = ["--score-test-unavailable", "--forecast-probe"]
        app.launch(); app.buttons["OpenForecastReview"].tap()
        XCTAssertTrue(label("Debug probe refused outside QA store.").waitForExistence(timeout: 15))
        XCTAssertTrue(label("Original · 73% Yes").exists)
        XCTAssertFalse(label("Forecast native probe PASS").exists)
        XCTAssertFalse(label("Synthetic QA original").exists)
        shot("forecast-probe-only-refused"); app.terminate()
    }

    func testExplicitOverwriteInvestigation() {
        continueAfterFailure = false
        open(["--forecast-probe", "--forecast-fake"])
        XCTAssertTrue(label("Forecast native probe PASS 15").waitForExistence(timeout: 20))
        let name = "forecast-overwrite-" + UUID().uuidString + ".json"
        func exportNamed() {
            tap("Export journal JSON")
            let field = app.textFields["DOCPicker.filenameTextField"]
            XCTAssertTrue(field.waitForExistence(timeout: 10))
            field.tap()
            // UIKit selects the basename when entering filename editing.
            field.press(forDuration: 1.2)
            if app.menuItems["Select All"].waitForExistence(timeout: 2) { app.menuItems["Select All"].tap() }
            else if app.buttons["Select All"].exists { app.buttons["Select All"].tap() }
            field.typeText(name)
            XCTAssertEqual(field.value as? String, name)
            app.buttons["Save"].tap()
        }
        exportNamed()
        XCTAssertTrue(label("Exported journal JSON").waitForExistence(timeout: 15))
        exportNamed()
        XCTAssertTrue(app.buttons["Replace"].waitForExistence(timeout: 10))
        shot("forecast-explicit-overwrite-confirmation")
        app.buttons["Replace"].tap()
        let completion = expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: app.webViews.buttons["Export journal JSON"])
        let completed = XCTWaiter.wait(for: [completion], timeout: 45) == .completed
        if completed { XCTAssertTrue(label("Exported journal JSON").exists) }
        shot(completed ? "forecast-overwrite-completed" : "forecast-overwrite-still-busy")
        if !completed {
            print("OVERWRITE_STILL_BUSY_45_SECONDS\n" + app.debugDescription)
            let top = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.09))
            top.press(forDuration: 0.2, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.95)))
            XCTAssertTrue(label("Export cancelled").waitForExistence(timeout: 10))
        }
        app.terminate(); open()
        XCTAssertTrue(label("Original Brier: 0.6400").waitForExistence(timeout: 10))
        XCTAssertTrue(label("Synthetic QA original").exists)
        XCTAssertTrue(label("Synthetic QA revision").exists)
        app.terminate()
        XCTAssertTrue(completed, "Files overwrite did not complete in 45 seconds; journal remained intact")
    }

}
