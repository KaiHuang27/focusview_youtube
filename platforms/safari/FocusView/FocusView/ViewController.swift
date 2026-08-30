//
//  ViewController.swift
//  FocusView
//
//  Created by Kai on 2026/6/18.
//

import Cocoa
import SafariServices
import WebKit

let extensionBundleIdentifier = "com.kodingai.focusview.Extension"

class ViewController: NSViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        webView.navigationDelegate = self
        webView.configuration.userContentController.add(self, name: "controller")

        guard
            let mainURL = Bundle.main.url(forResource: "Main", withExtension: "html"),
            let resourceURL = Bundle.main.resourceURL
        else {
            showError(
                title: "Unable to load FocusView",
                message: "The app resources are missing. Reinstall FocusView and try again."
            )
            return
        }

        webView.loadFileURL(mainURL, allowingReadAccessTo: resourceURL)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { [weak self, weak webView] state, error in
            guard let state = state, error == nil else {
                let message = error?.localizedDescription
                    ?? "FocusView could not read the Safari extension state."
                DispatchQueue.main.async {
                    self?.showError(
                        title: "Unable to check the Safari extension",
                        message: message
                    )
                }
                return
            }

            DispatchQueue.main.async {
                guard let webView = webView else {
                    return
                }

                if #available(macOS 13, *) {
                    webView.evaluateJavaScript("show(\(state.isEnabled), true)")
                } else {
                    webView.evaluateJavaScript("show(\(state.isEnabled), false)")
                }
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.body as? String == "open-preferences" else {
            return
        }

        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { [weak self] error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.showError(
                        title: "Unable to open Safari Extensions Settings",
                        message: error.localizedDescription
                    )
                    return
                }

                NSApplication.shared.terminate(nil)
            }
        }
    }

    private func showError(title: String, message: String) {
        let alert = NSAlert()
        alert.alertStyle = .warning
        alert.messageText = title
        alert.informativeText = message
        alert.runModal()
    }

}
