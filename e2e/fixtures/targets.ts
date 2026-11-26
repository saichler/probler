/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
You may obtain a copy of the License at:

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
// Polling targets (Targets service, area 91): find a device's target by its IP
// and stop or start it. Stopping makes the collector report the device down;
// starting polls it again -- both are real writes of the device record.

import { expect } from '@playwright/test';
import { Api } from './api';
import { WsPush } from './wspushes';

export const TARGETS = '/91/Targets';
export const TARGET_DOWN = 1;
export const TARGET_UP = 2;

interface Target {
    targetId: string;
    state?: number;
    hosts?: Record<string, { configs?: Record<string, { addr?: string }> }>;
}

/** The network-device target that polls `ip`. */
export async function targetOfIp(api: Api, ip: string): Promise<Target> {
    const res = await api.query<Target>(TARGETS, 'select * from L8PTarget where inventoryType=1 limit 500 page 0');
    const target = res.list.find((t) => Object.values(t.hosts || {}).some((h) =>
        Object.values(h.configs || {}).some((c) => c.addr === ip)));
    expect(target, `no target polls ${ip}`).toBeTruthy();
    return target!;
}

export async function setTargetState(api: Api, targetId: string, state: number): Promise<void> {
    await api.patch(TARGETS, { targetId, state });
}

/** Waits for a NetworkDevice push of `ip` after index `from` of `pushes`; returns the new length. */
export async function waitForDevicePush(pushes: WsPush[], from: number, ip: string, what: string): Promise<number> {
    await expect.poll(() => pushes.slice(from).some((p) => p.modelType === 'NetworkDevice' && p.primaryKey === ip),
        { timeout: 120000, intervals: [1000], message: `no push for ${ip} after the target was ${what}` }).toBe(true);
    return pushes.length;
}
