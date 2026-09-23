import SwiftUI

struct ProfileView: View {
    @ObservedObject private var auth = AuthService.shared
    @State private var isDeleteAccountOpen = false
    @State private var phoneInput = ""
    @State private var otpInput = ""
    @State private var generatedDevCode: String?
    @State private var isOtpStep = false
    @State private var authErrorMessage: String?
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        if auth.isAuthenticated, let user = auth.currentUser {
                            // Authenticated User Profile
                            VStack(spacing: 12) {
                                Image(systemName: "person.crop.circle.fill")
                                    .font(.system(size: 64))
                                    .foregroundColor(.brandAccent)
                                
                                Text(user.name ?? "DASHit Shopper")
                                    .font(.dashitHeadline)
                                    .foregroundColor(.white)
                                
                                Text("+91 \(user.mobile)")
                                    .font(.dashitCaption)
                                    .foregroundColor(.textMuted)
                            }
                            .padding(.top, 20)
                            
                            // Account Options
                            VStack(spacing: 1) {
                                NavigationLink(destination: Text("Address Book").foregroundColor(.white)) {
                                    ProfileRow(icon: "mappin.circle.fill", title: "Saved Addresses")
                                }
                                NavigationLink(destination: Text("Payment Settings").foregroundColor(.white)) {
                                    ProfileRow(icon: "creditcard.fill", title: "Payment Methods")
                                }
                                NavigationLink(destination: Text("Help & Support").foregroundColor(.white)) {
                                    ProfileRow(icon: "questionmark.circle.fill", title: "24/7 Support in Anantnag")
                                }
                            }
                            .background(Color.surfaceRaised)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.hairline, lineWidth: 1)
                            )
                            
                            // Sign Out & Delete Account
                            VStack(spacing: 12) {
                                Button(action: { auth.signOut() }) {
                                    Text("Sign Out")
                                        .font(.dashitBodyBold)
                                        .foregroundColor(.white)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(Color.surfaceRaised)
                                        .cornerRadius(12)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(Color.hairline, lineWidth: 1)
                                        )
                                }
                                
                                Button(action: { isDeleteAccountOpen = true }) {
                                    Text("Delete Account")
                                        .font(.dashitCaptionBold)
                                        .foregroundColor(.danger)
                                }
                            }
                            .padding(.top, 16)
                            
                        } else {
                            // Phone OTP Login Card (Matching src/lib/auth.js Spark Tier)
                            VStack(spacing: 16) {
                                Image(systemName: "bolt.shield.fill")
                                    .font(.system(size: 48))
                                    .foregroundColor(.brandAccent)
                                
                                Text("Sign In to DASHit")
                                    .font(.dashitHeadline)
                                    .foregroundColor(.white)
                                
                                Text("Get fresh groceries and Kashmiri essentials delivered to your door in 8 minutes.")
                                    .font(.dashitCaption)
                                    .foregroundColor(.textMuted)
                                    .multilineTextAlignment(.center)
                                
                                if !isOtpStep {
                                    // Phone Number Input Step
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text("Phone Number")
                                            .font(.dashitCaptionBold)
                                            .foregroundColor(.white)
                                        
                                        HStack {
                                            Text("+91")
                                                .foregroundColor(.textMuted)
                                                .font(.dashitBodyBold)
                                            TextField("10-digit mobile number", text: $phoneInput)
                                                .keyboardType(.numberPad)
                                                .font(.dashitBody)
                                                .foregroundColor(.white)
                                        }
                                        .padding(12)
                                        .background(Color.surfaceMuted)
                                        .cornerRadius(10)
                                    }
                                    
                                    Button(action: {
                                        guard phoneInput.count >= 10 else { return }
                                        let code = auth.requestVerificationCode(mobile: phoneInput)
                                        generatedDevCode = code
                                        isOtpStep = true
                                        HapticsManager.shared.light()
                                    }) {
                                        Text("Send OTP Code")
                                            .font(.dashitBodyBold)
                                            .foregroundColor(.white)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 14)
                                            .background(Color.brandOrange)
                                            .cornerRadius(10)
                                    }
                                } else {
                                    // 4-Digit OTP Entry Step
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text("Enter 4-Digit Code")
                                            .font(.dashitCaptionBold)
                                            .foregroundColor(.white)
                                        
                                        TextField("0000", text: $otpInput)
                                            .keyboardType(.numberPad)
                                            .font(.system(size: 24, weight: .bold, design: .rounded))
                                            .multilineTextAlignment(.center)
                                            .padding(12)
                                            .background(Color.surfaceMuted)
                                            .cornerRadius(10)
                                            .foregroundColor(.white)
                                        
                                        if let devCode = generatedDevCode {
                                            Text("Verification Code: \(devCode)")
                                                .font(.dashitMicro)
                                                .foregroundColor(.caution)
                                        }
                                    }
                                    
                                    Button(action: {
                                        Task {
                                            do {
                                                _ = try await auth.verifyCodeAndSignIn(mobile: phoneInput, enteredCode: otpInput)
                                                isOtpStep = false
                                            } catch {
                                                authErrorMessage = error.localizedDescription
                                            }
                                        }
                                    }) {
                                        Text("Verify & Continue")
                                            .font(.dashitBodyBold)
                                            .foregroundColor(.white)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 14)
                                            .background(Color.brandOrange)
                                            .cornerRadius(10)
                                    }
                                }
                                
                                if let err = authErrorMessage {
                                    Text(err)
                                        .font(.dashitCaption)
                                        .foregroundColor(.danger)
                                }
                            }
                            .padding(20)
                            .background(Color.surfaceRaised)
                            .cornerRadius(16)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Color.hairline, lineWidth: 1)
                            )
                            .padding(.top, 20)
                        }
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $isDeleteAccountOpen) {
                DeleteAccountView()
            }
        }
    }
}

struct ProfileRow: View {
    let icon: String
    let title: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(.brandAccent)
            Text(title)
                .font(.dashitBody)
                .foregroundColor(.white)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12))
                .foregroundColor(.textMuted)
        }
        .padding(14)
    }
}
