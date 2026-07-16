import SwiftUI

struct PasteTextSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    var onSubmit: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Paste Text")
                .font(.title2.weight(.semibold))
            TextEditor(text: $text)
                .font(.body)
                .frame(minWidth: 480, minHeight: 320)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(.separator))
            HStack {
                Spacer()
                Button("Cancel") { dismiss() }
                Button("Create Session") {
                    onSubmit(text)
                    dismiss()
                }
                .keyboardShortcut(.defaultAction)
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .padding(20)
    }
}
