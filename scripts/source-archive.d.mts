/*
 * SPDX-FileCopyrightText: 2026 Coffey Labs
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export function sourceIdentity(root: string): { ref: string | null; id: string };
export function writeSourceArchive(root: string, outFile: string, name: string, identity: { ref: string | null; id: string }): void;
