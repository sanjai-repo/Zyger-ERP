package in.zygertechnology.zygererp.entity;

import java.math.BigDecimal;

public interface LineEntity {
    String getItemCode(); String getLocation(); String getBatchNo(); String getHeatNo();
    BigDecimal getQty();
    default BigDecimal getRate() { return null; }
}
