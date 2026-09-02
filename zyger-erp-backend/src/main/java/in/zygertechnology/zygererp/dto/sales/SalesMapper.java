package in.zygertechnology.zygererp.dto.sales;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class SalesMapper {

    public SalesOrderResponse toSalesOrderResponse(DocEntity entity, Map<String, Object> rawRow) {
        if (!(entity instanceof SalesOrder so)) {
            return null;
        }

        SalesOrderResponse response = new SalesOrderResponse();
        response.setId(so.getId());
        response.setDocNo(so.getDocNo());
        response.setStatus(so.getStatus());
        response.setCustomer(strVal(rawRow, "customer"));
        response.setCustomerCode(strVal(rawRow, "customerCode"));
        response.setOrderDate(so.getDocDate());
        response.setDeliveryDate(so.getDeliveryDate());
        response.setSoType(so.getSoType());
        response.setNotes(strVal(rawRow, "notes"));
        response.setRemarks(strVal(rawRow, "remarks"));
        response.setDeliveryAddress(strVal(rawRow, "deliveryAddress"));
        response.setPaymentTerms(strVal(rawRow, "paymentTerms"));

        response.setOrderedQty(so.getOrderedQty());
        response.setPendingQty(so.getPendingQty());
        response.setDispatchedQty(so.getDispatchedQty());
        response.setInvoicedQty(so.getInvoicedQty());
        response.setReturnedQty(so.getReturnedQty());

        response.setCreatedBy(so.getCreatedBy());
        response.setCreatedAt(so.getCreatedAt());
        response.setUpdatedBy(so.getUpdatedBy());
        response.setUpdatedAt(so.getUpdatedAt());

        // Map lines
        if (so.getLines() != null) {
            List<SalesOrderResponse.SalesOrderLineResponse> lineResponses = new ArrayList<>();
            for (SalesOrderItem item : so.getLines()) {
                SalesOrderResponse.SalesOrderLineResponse lr = new SalesOrderResponse.SalesOrderLineResponse();
                lr.setId(item.getId());
                lr.setItemCode(item.getItemCode());
                lr.setItemDesc(item.getDescription() != null ? item.getDescription() : item.getItemName());
                lr.setOrderQty(item.getOrderQty());
                lr.setUnitPrice(item.getUnitPrice());
                lr.setDiscount(item.getDiscount());
                lr.setTax(item.getTax());
                lr.setNetAmount(item.getNetAmount());
                lr.setDrawingRevision(item.getDrawingRevision());
                lr.setRequiredDeliveryDate(item.getRequiredDeliveryDate());
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
