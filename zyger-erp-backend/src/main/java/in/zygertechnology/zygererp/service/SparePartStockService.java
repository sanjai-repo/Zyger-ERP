package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.BreakdownRectificationPart;
import in.zygertechnology.zygererp.entity.PmCompletionPart;
import in.zygertechnology.zygererp.entity.StockLedger;
import in.zygertechnology.zygererp.repository.BreakdownRectificationPartRepository;
import in.zygertechnology.zygererp.repository.PmCompletionPartRepository;
import in.zygertechnology.zygererp.repo.StockLedgerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SparePartStockService {

    private final BreakdownRectificationPartRepository rectificationParts;
    private final PmCompletionPartRepository pmParts;
    private final StockLedgerRepository ledger;

    /**
     * §7.3: When a breakdown rectification is saved, auto-post stock issues for
     * all linked spare parts with qty_used > 0 and no inventory_txn_id yet.
     */
    @Transactional
    public int postRectificationStockIssues(Long rectificationId, String docNo, String machineCode) {
        var parts = rectificationParts.findByRectificationId(rectificationId);
        int posted = 0;
        for (BreakdownRectificationPart part : parts) {
            if (part.getInventoryTxnId() != null) continue;
            if (part.getQtyUsed() == null || part.getSparePart() == null) continue;

            String itemCode = part.getSparePart().getCode();
            String location = machineCode != null ? machineCode : "MAINT-STOCK";

            StockLedger txn = StockLedger.builder()
                    .txDate(LocalDate.now())
                    .docNo(docNo != null ? docNo : "BDR-" + rectificationId)
                    .docType("BREAKDOWN_PART")
                    .txType("ISSUE")
                    .itemCode(itemCode)
                    .location(location)
                    .stockStatus("FREE")
                    .inQty(null)
                    .outQty(part.getQtyUsed())
                    .createdBy("system")
                    .build();
            StockLedger saved = ledger.save(txn);
            part.setInventoryTxnId(saved.getId());
            rectificationParts.save(part);
            posted++;
            log.info("Auto-posted stock issue for spare part {} qty={} on rectification {}",
                    itemCode, part.getQtyUsed(), rectificationId);
        }
        return posted;
    }

    /**
     * §7.3: When a PM completion is saved, auto-post stock issues for
     * all linked spare parts with qty_used > 0 and no inventory_txn_id yet.
     */
    @Transactional
    public int postPmCompletionStockIssues(Long completionId, String docNo, String machineCode) {
        var parts = pmParts.findByCompletionId(completionId);
        int posted = 0;
        for (PmCompletionPart part : parts) {
            if (part.getInventoryTxnId() != null) continue;
            if (part.getQtyUsed() == null || part.getSparePart() == null) continue;

            String itemCode = part.getSparePart().getCode();
            String location = machineCode != null ? machineCode : "MAINT-STOCK";

            StockLedger txn = StockLedger.builder()
                    .txDate(LocalDate.now())
                    .docNo(docNo != null ? docNo : "PMC-" + completionId)
                    .docType("PM_PART")
                    .txType("ISSUE")
                    .itemCode(itemCode)
                    .location(location)
                    .stockStatus("FREE")
                    .inQty(null)
                    .outQty(part.getQtyUsed())
                    .createdBy("system")
                    .build();
            StockLedger saved = ledger.save(txn);
            part.setInventoryTxnId(saved.getId());
            pmParts.save(part);
            posted++;
            log.info("Auto-posted stock issue for spare part {} qty={} on PM completion {}",
                    itemCode, part.getQtyUsed(), completionId);
        }
        return posted;
    }
}
