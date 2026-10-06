import Foundation
import CoreFoundation

struct ExportPacket {
    // Compact journal <=250000 UTF-16 units: UTF-8 <=750000 bytes.
    // Pretty-print whitespace for the fixed 100+100-record schema stays below 50000 bytes.
    static let maxJSONBytes = 1_048_576 // Conservative bound >800000; no unbounded export.
    let id: String
    let json: String
    static func parse(_ body: Any) -> ExportPacket? {
        guard let d=body as? [String:Any],Set(d.keys)==Set(["version","requestID","operation","json"]),
              let version=d["version"] as? NSNumber,CFGetTypeID(version) != CFBooleanGetTypeID(),version.doubleValue==1,
              let id=d["requestID"] as? String,id.count==36,UUID(uuidString:id) != nil,
              d["operation"] as? String == "saveJournalJSON",let json=d["json"] as? String,
              let bytes=json.data(using:.utf8),bytes.count<=maxJSONBytes,
              let value=(try? JSONSerialization.jsonObject(with:bytes)) as? [String:Any],
              Set(value.keys)==Set(["schema","clock","forecasts","outcomes"]),
              let schema=value["schema"] as? NSNumber,CFGetTypeID(schema) != CFBooleanGetTypeID(),schema.doubleValue==1,
              value["clock"] is String,let forecasts=value["forecasts"] as? [[String:Any]],forecasts.count<=100,
              let outcomes=value["outcomes"] as? [[String:Any]],outcomes.count<=100 else { return nil }
        return ExportPacket(id:id,json:json)
    }
}

