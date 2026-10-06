import Foundation
@main struct LifecycleTests {
    @MainActor static func main() async {
        let gate=ScoreRequestGate()
        var oldContinuation: CheckedContinuation<String,Error>?, newContinuation: CheckedContinuation<String,Error>?
        var oldReplies=0,newReplies=0,newValue:String?
        gate.start(read:{try await withCheckedThrowingContinuation {oldContinuation=$0}},reply:{_,error in oldReplies+=1;precondition(error != nil)})
        while oldContinuation==nil {await Task.yield()}
        precondition(gate.isBusy)
        gate.cancel();gate.cancel()
        precondition(oldReplies==1 && !gate.isBusy)
        gate.start(read:{try await withCheckedThrowingContinuation {newContinuation=$0}},reply:{value,error in newReplies+=1;newValue=value as? String;precondition(error==nil)})
        while newContinuation==nil {await Task.yield()}
        oldContinuation?.resume(returning:"late old response")
        for _ in 0..<20 {await Task.yield()}
        precondition(gate.isBusy && oldReplies==1 && newReplies==0)
        newContinuation?.resume(returning:"new response")
        while gate.isBusy {await Task.yield()}
        precondition(newReplies==1 && newValue=="new response")
        var teardownReplies=0
        gate.start(read:{try await Task.sleep(for:.seconds(30));return "must not complete"},reply:{_,error in teardownReplies+=1;precondition(error != nil)})
        await Task.yield();gate.cancel()
        for _ in 0..<20 {await Task.yield()}
        precondition(teardownReplies==1 && !gate.isBusy)
        print("PASS cancellation/teardown reply exactly once; noncooperative old completion cannot clear or overwrite newer request; positive retry succeeds")
    }
}
