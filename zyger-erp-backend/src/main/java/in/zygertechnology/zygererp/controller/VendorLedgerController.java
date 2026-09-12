package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.service.VendorLedgerService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * FRS DOC-PUR-FRS-02 §11 (PUR-09/PUR-11) — Vendor Ledger & Ageing.
 * Read-only: entries are written by DocumentFacade when Purchase Invoice / Purchase Return
 * documents POST (see DocumentFacade.postToVendorLedger).
 */
@RestController
@RequestMapping("/api/master/vendor-ledger")
@RequiredArgsConstructor
public class VendorLedgerController {

    private final VendorLedgerService ledger;

    @Operation(summary = "Get one supplier's ledger with running balance")
    @GetMapping("/{partyCode}")
    Map<String, Object> ledgerFor(@PathVariable String partyCode) {
        return ledger.ledgerFor(partyCode);
    }

    @Operation(summary = "Get one supplier's ageing buckets (0-30/31-60/61-90/90+)")
    @GetMapping("/{partyCode}/ageing")
    Map<String, Object> ageingFor(@PathVariable String partyCode) {
        return ledger.ageingFor(partyCode);
    }

    @Operation(summary = "Ageing buckets for every supplier with ledger activity")
    @GetMapping("/ageing")
    List<Map<String, Object>> ageingAll() {
        return ledger.ageingAll();
    }
}
