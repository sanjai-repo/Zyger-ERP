package in.zygertechnology.zygererp.dto.purchase;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class PurchaseMapper {

    public PurchaseOrderResponse toPurchaseOrderResponse(DocEntity entity, Map<String, Object> rawRow) {
        if (!(entity instanceof PurchaseOrder po)) {
            return null;
        }

        PurchaseOrderResponse response = new PurchaseOrderResponse();
        response.setId(po.getId());
        response.setDocNo(po.getDocNo());
        response.setStatus(po.getStatus());
        response.setSupplier(strVal(rawRow, "supplier"));
        response.setSupplierCode(strVal(rawRow, "supplierCode"));
        response.setContactPerson(strVal(rawRow, "contactPerson"));
        response.setPhone(strVal(rawRow, "phone"));
        response.setEmail(strVal(rawRow, "email"));
        response.setOrderDate(po.getDocDate());
        response.setDeliveryDate(po.getExpectedDeliveryDate());
        response.setPaymentTerms(strVal(rawRow, "paymentTerms"));
        response.setNotes(strVal(rawRow, "notes"));
        response.setRemarks(strVal(rawRow, "remarks"));
        response.setDeliveryAddress(strVal(rawRow, "deliveryAddress"));

        response.setCreatedBy(po.getCreatedBy());
        response.setCreatedAt(po.getCreatedAt());
        response.setUpdatedBy(po.getUpdatedBy());
        response.setUpdatedAt(po.getUpdatedAt());

        // Map lines
        if (po.getLines() != null) {
            List<PurchaseOrderResponse.PurchaseOrderLineResponse> lineResponses = new ArrayList<>();
            for (PurchaseOrderItem item : po.getLines()) {
                PurchaseOrderResponse.PurchaseOrderLineResponse lr = new PurchaseOrderResponse.PurchaseOrderLineResponse();
                lr.setId(item.getId());
                lr.setItemCode(item.getItemCode());
                lr.setItemDesc(item.getItemName());
                lr.setOrderQty(item.getOrderQty());
                lr.setUnitPrice(item.getUnitPrice());
                lr.setDiscount(item.getDiscount());
                lr.setTax(item.getTax());
                lr.setNetAmount(item.getNetAmount());
                lr.setRemarks(item.getRemarks());
                lineResponses.add(lr);
            }
            response.setLines(lineResponses);
        }

        // Allowed transitions from workflow
        @SuppressWarnings("unchecked")
        List<String> transitions = (List<String>) rawRow.get("allowedTransitions");
        if (transitions != null) {
            response.setAllowedTransitions(transitions);
        }

        return response;
    }

    private String strVal(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v == null ? null : String.valueOf(v);
    }
}
