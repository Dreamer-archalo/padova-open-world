# Padova road levels R21 — work in progress

This branch changes the local Padova road-height solver. It separates motorway and trunk profiles from the common street-height field, keeps inferred overpasses on their own profiles, and extends tagged bridge approaches across adjoining OSM ways. It also constrains the street field below mapped crossings so the lower road does not rise with the deck.

The automated scan of the **Padova extract** finds 428 candidate geometric crossings with no shared mapped vertex. Of those, 368 have at least 5.2 m of measured centre-line separation; all 26 candidates within 650 m of the IKEA reference point pass. Before R21, 422 of 428 were below 5.2 m. These candidates are a topology heuristic, not a survey of all physical junctions; the numbers do not prove that every interchange is correct. The scan includes highways, tangenziali and their links across the extract. The streamed regional road network needs separate field testing.

**Open:** 60 candidates remain below 5.2 m. The larger clusters are Cavalcavia Stati Uniti (8), Autostrada Bologna–Padova (6), Corso Tredici Giugno (4), Cavalcavia Tevere (4) and Corso Australia (4). Some readings around 5.17–5.19 m need a tolerance review; readings around 0–3 m and the negative ones need a topology and driving inspection before further height edits. See `interchange-audit-r20.json` for coordinates, road names and measured clearance.

The corrected grade graph passed the automated slope, road shoulder and junction checks. Eight motorway stunt ramps plus the southern airport ramp pass the driving simulation. Browser visuals, frame rate, the 60 remaining crossings, and the regional map are still unverified. Do not merge this branch as a completed interchange overhaul.
