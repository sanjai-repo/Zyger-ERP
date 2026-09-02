package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="physical_stock_amendment") @Getter @Setter @DocKey("physical-stock-amendment")
public class PhysicalStockAmendment extends BaseDoc implements DocEntity {
    String storeLocation;
    String countTeam;
    String countType;
    @jakarta.persistence.OneToMany(mappedBy="doc", cascade=jakarta.persistence.CascadeType.ALL, orphanRemoval=true, fetch=jakarta.persistence.FetchType.EAGER)
    java.util.List<PhysicalStockAmendmentLine> lines = new java.util.ArrayList<>();
}
