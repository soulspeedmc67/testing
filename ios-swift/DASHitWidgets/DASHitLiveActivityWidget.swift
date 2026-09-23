import SwiftUI
import WidgetKit
import ActivityKit

struct DASHitLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DASHitOrderAttributes.self) { context in
            // Lock Screen Banner UI
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    HStack(spacing: 6) {
                        Image(systemName: "bolt.fill")
                            .foregroundColor(.yellow)
                        Text("DASHIT DELIVERY")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                    }
                    Spacer()
                    Text("ARRIVING IN \(context.state.etaMinutes) MINS")
                        .font(.system(size: 13, weight: .heavy))
                        .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))
                }
                
                HStack(spacing: 12) {
                    Image(systemName: "scooter")
                        .font(.system(size: 26))
                        .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.state.status.replacingOccurrences(of: "_", with: " ").capitalized)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                        
                        Text("\(context.attributes.itemCount) items • ₹\(Int(context.attributes.totalAmount))")
                            .font(.system(size: 12))
                            .foregroundColor(.gray)
                    }
                    
                    Spacer()
                    
                    if let driver = context.state.driverName {
                        Text("Rider: \(driver)")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.gray)
                    }
                }
                
                // Progress Bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.white.opacity(0.15)).frame(height: 5)
                        Capsule()
                            .fill(Color(red: 16/255, green: 185/255, blue: 129/255))
                            .frame(width: geo.size.width * CGFloat(context.state.progress), height: 5)
                    }
                }
                .frame(height: 5)
            }
            .padding(14)
            .background(Color(red: 9/255, green: 9/255, blue: 11/255))
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded Dynamic Island
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Image(systemName: "scooter")
                            .font(.system(size: 20))
                            .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))
                        Text(context.state.status.replacingOccurrences(of: "_", with: " ").capitalized)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(context.state.etaMinutes) mins")
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text("\(context.attributes.itemCount) items on the way")
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                        Spacer()
                        Text("₹\(Int(context.attributes.totalAmount))")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
            } compactLeading: {
                Image(systemName: "scooter")
                    .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))
            } compactTrailing: {
                Text("\(context.state.etaMinutes)m")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))
            } minimal: {
                Image(systemName: "scooter")
                    .foregroundColor(Color(red: 16/255, green: 185/255, blue: 129/255))
            }
        }
    }
}
