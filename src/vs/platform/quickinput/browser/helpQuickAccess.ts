/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IQuickPick, IQuickPickItem, IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { IQuickAccessProvider, IQuickAccessRegistry, Extensions } from 'vs/platform/quickinput/common/quickAccess';
import { Registry } from 'vs/platform/registry/common/platform';
import { CancellationToken } from 'vs/base/common/cancellation';
import { localize } from 'vs/nls';
import { DisposableStore, IDisposable } from 'vs/base/common/lifecycle';

interface IHelpQuickAccessPickItem extends IQuickPickItem {
	prefix: string;
}

export class HelpQuickAccessProvider implements IQuickAccessProvider {

	static PREFIX = '?';

	private readonly registry = Registry.as<IQuickAccessRegistry>(Extensions.Quickaccess);

	constructor(@IQuickInputService private readonly quickInputService: IQuickInputService) { }

	provide(picker: IQuickPick<IHelpQuickAccessPickItem>, token: CancellationToken): IDisposable {
		const disposables = new DisposableStore();

		// Open a picker with the selected value if picked
		disposables.add(picker.onDidAccept(() => {
			const [item] = picker.selectedItems;
			if (item) {
				this.quickInputService.quickAccess.show(item.prefix);
			}
		}));

		// Fill in all providers separated by editor/global scope
		const { editorProviders, globalProviders } = this.getQuickAccessProviders();
		picker.items = editorProviders.length === 0 || globalProviders.length === 0 ?

			// Without groups
			[
				...(editorProviders.length === 0 ? globalProviders : editorProviders)
			] :

			// With groups
			[
				{ label: localize('globalCommands', "global commands"), type: 'separator' },
				...globalProviders,
				{ label: localize('editorCommands', "editor commands"), type: 'separator' },
				...editorProviders
			];

		return disposables;
	}

	private getQuickAccessProviders(): { editorProviders: IHelpQuickAccessPickItem[], globalProviders: IHelpQuickAccessPickItem[] } {
		const globalProviders: IHelpQuickAccessPickItem[] = [];
		const editorProviders: IHelpQuickAccessPickItem[] = [];

		for (const provider of this.registry.getQuickAccessProviders().sort((p1, p2) => p1.prefix.localeCompare(p2.prefix))) {
			for (const helpEntry of provider.helpEntries) {
				const prefix = helpEntry.prefix || provider.prefix;
				const label = prefix || '\u2026' /* ... */;

				(helpEntry.needsEditor ? editorProviders : globalProviders).push({
					prefix,
					label,
					description: helpEntry.description,
					ariaLabel: localize('entryAriaLabel', "{0}, picker help", label)
				});
			}
		}

		return { editorProviders, globalProviders };
	}
}

