/*
 * Kubernetes Explorer — SVG illustration template registered with
 * Layer8SvgFactory. The factory wraps the returned elements in a
 * 1200×120 <svg> with grid lines, paths, and animated dots, then the
 * hero (Layer8SectionGenerator.renderHero) embeds that SVG as the
 * parallax background.
 *
 * The motif mirrors the Kubernetes logo's heptagonal wheel: a central
 * hub plus seven satellite cells, with subtle connection lines and a
 * couple of pulsing status dots. One template covers every K8s
 * resource type; the title text differentiates Pods vs Deployments etc.
 *
 * Theme awareness is via the gradientId Layer8SvgFactory passes in —
 * defs are emitted by the factory wrapper, so we just reference
 * url(#${gradientId}) for fills. Colors that need more nuance use the
 * factory's PRIMARY/SECONDARY conventions implicitly via the gradient.
 */
(function() {
    'use strict';

    if (typeof Layer8SvgFactory === 'undefined') {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('K8sExplorerSvg: Layer8SvgFactory missing — script include order may be wrong.');
        }
        return;
    }

    Layer8SvgFactory.registerTemplate('k8s-explorer', function(gradientId) {
        // 7-spoke heptagonal cluster motif. Centered around (600, 60)
        // (factory viewBox is 1200x120). The radius keeps cells inside
        // the hero band even at narrow viewports because the SVG uses
        // preserveAspectRatio="xMidYMid slice" on the factory's wrapper.
        var cx = 600;
        var cy = 60;
        var r = 38; // distance from hub to each satellite cell center
        var angles = [-90, -90 + 51.43, -90 + 102.86, -90 + 154.29, -90 + 205.72, -90 + 257.14, -90 + 308.57];
        // (-90 = top; 360/7 ≈ 51.43° between cells)

        // Build satellite cell hexagons + connection lines from the hub.
        var cells = '';
        var lines = '';
        for (var i = 0; i < angles.length; i++) {
            var rad = angles[i] * Math.PI / 180;
            var x = cx + r * Math.cos(rad);
            var y = cy + r * Math.sin(rad);
            cells += hexagon(x, y, 9, gradientId, 0.55 + (i % 3) * 0.1);
            lines += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1)
                  +  '" stroke="url(#' + gradientId + ')" stroke-width="1" opacity="0.45"/>';
        }

        // Pulsing status dots on three of the satellite cells, just to add
        // a hint of life — same style as the GPU section's status LEDs.
        var pulses = ''
            + dot(cx + r * Math.cos(angles[0] * Math.PI / 180), cy + r * Math.sin(angles[0] * Math.PI / 180), 'rgba(34,197,94,0.95)',  '2.0s')
            + dot(cx + r * Math.cos(angles[2] * Math.PI / 180), cy + r * Math.sin(angles[2] * Math.PI / 180), 'rgba(245,158,11,0.95)',  '2.6s')
            + dot(cx + r * Math.cos(angles[4] * Math.PI / 180), cy + r * Math.sin(angles[4] * Math.PI / 180), 'rgba(14,165,233,0.95)', '2.3s');

        // Central hub — a slightly larger hexagon plus the K8s 'wheel' inner ring.
        var hub = ''
            + hexagon(cx, cy, 14, gradientId, 0.85)
            + '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="none" stroke="url(#' + gradientId + ')" stroke-width="1.5" opacity="0.85"/>'
            + '<circle cx="' + cx + '" cy="' + cy + '" r="2.5" fill="url(#' + gradientId + ')" opacity="0.95"/>';

        return ''
            + '<g class="k8s-cluster-motif">'
            +   lines
            +   cells
            +   hub
            +   pulses
            + '</g>';
    });

    /**
     * Build a hexagon SVG path centered at (cx, cy) with a given radius
     * (vertex distance from center). Flat-top orientation matches the
     * Kubernetes brand mark.
     */
    function hexagon(cx, cy, radius, gradientId, opacity) {
        var pts = [];
        for (var i = 0; i < 6; i++) {
            var a = (60 * i) * Math.PI / 180;
            var x = cx + radius * Math.cos(a);
            var y = cy + radius * Math.sin(a);
            pts.push(x.toFixed(2) + ',' + y.toFixed(2));
        }
        return '<polygon points="' + pts.join(' ') + '"'
             + ' fill="url(#' + gradientId + ')"'
             + ' stroke="url(#' + gradientId + ')" stroke-width="1.2"'
             + ' opacity="' + opacity + '"/>';
    }

    /**
     * Pulsing status dot (small filled circle with an opacity animation).
     * Color is hard-coded per dot for status semantics (green / amber /
     * cyan); these are the same hex values the GPU section's hero uses.
     */
    function dot(cx, cy, fill, dur) {
        return '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="2.5" fill="' + fill + '">'
             +   '<animate attributeName="opacity" values="0.3;1;0.3" dur="' + dur + '" repeatCount="indefinite"/>'
             + '</circle>';
    }
})();
