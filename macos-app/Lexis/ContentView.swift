import SwiftUI
import WebKit

/// Points at the locally running Lexis frontend (`npm run dev` / `docker compose up`
/// on http://localhost:3000). Milestone 1: no process management yet — start the
/// backend and frontend yourself before launching this app.
private let lexisURL = URL(string: "http://localhost:3000")!

struct ContentView: View {
    @State private var loadFailed = false

    var body: some View {
        ZStack {
            LexisWebView(url: lexisURL, loadFailed: $loadFailed)

            if loadFailed {
                VStack(spacing: 12) {
                    Image(systemName: "wifi.slash")
                        .font(.system(size: 40))
                    Text("Can't reach Lexis at \(lexisURL.absoluteString)")
                        .font(.headline)
                    Text("Start the backend and frontend first, e.g. `docker compose up` in the project root, then relaunch this app.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 420)
                }
                .padding(32)
                .background(.regularMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .frame(minWidth: 1100, minHeight: 750)
    }
}

private struct LexisWebView: NSViewRepresentable {
    let url: URL
    @Binding var loadFailed: Bool

    func makeCoordinator() -> Coordinator {
        Coordinator(loadFailed: $loadFailed)
    }

    func makeNSView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        @Binding var loadFailed: Bool

        init(loadFailed: Binding<Bool>) {
            _loadFailed = loadFailed
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            loadFailed = true
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            loadFailed = false
        }
    }
}

#Preview {
    ContentView()
}
