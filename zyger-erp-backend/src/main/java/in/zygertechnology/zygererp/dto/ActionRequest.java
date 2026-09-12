package in.zygertechnology.zygererp.dto;

import lombok.Data;

import java.util.Map;

@Data
public class ActionRequest {

    private String note;

    private Map<String, Object> options;
}
