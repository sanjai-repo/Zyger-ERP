package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.VendorLedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VendorLedgerRepository extends JpaRepository<VendorLedgerEntry, Long> {
    List<VendorLedgerEntry> findByPartyCodeOrderByEntryDateAscIdAsc(String partyCode);
    List<VendorLedgerEntry> findAllByOrderByPartyCodeAscEntryDateAscIdAsc();
    boolean existsByRefDocTypeAndRefDocNo(String refDocType, String refDocNo);
}
