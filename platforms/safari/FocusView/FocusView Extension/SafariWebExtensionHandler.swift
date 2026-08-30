//
//  SafariWebExtensionHandler.swift
//  FocusView Extension
//
//  Created by Kai on 2026/6/18.
//

import SafariServices

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        context.completeRequest(returningItems: [], completionHandler: nil)
    }

}
