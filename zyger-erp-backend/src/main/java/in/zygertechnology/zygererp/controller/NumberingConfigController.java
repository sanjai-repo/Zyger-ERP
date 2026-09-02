package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.NumberingConfig;
import in.zygertechnology.zygererp.repo.NumberingConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/master/numbering-config")
@RequiredArgsConstructor
public class NumberingConfigController {

    private final NumberingConfigRepository repo;

    @GetMapping
    public List<NumberingConfig> list() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<NumberingConfig> get(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public NumberingConfig create(@RequestBody NumberingConfig config) {
        config.setId(null);
        if (config.getZeroPad() == null || config.getZeroPad() < 1) config.setZeroPad(6);
        if (config.getResetPerYear() == null) config.setResetPerYear(true);
        if (config.getActive() == null) config.setActive(true);
        return repo.save(config);
    }

    @PutMapping("/{id}")
    public ResponseEntity<NumberingConfig> update(@PathVariable Long id, @RequestBody NumberingConfig incoming) {
        return repo.findById(id).map(existing -> {
            existing.setDocType(incoming.getDocType());
            existing.setPrefix(incoming.getPrefix());
            if (incoming.getZeroPad() != null && incoming.getZeroPad() >= 1) existing.setZeroPad(incoming.getZeroPad());
            if (incoming.getResetPerYear() != null) existing.setResetPerYear(incoming.getResetPerYear());
            existing.setSeparator(incoming.getSeparator());
            if (incoming.getActive() != null) existing.setActive(incoming.getActive());
            return ResponseEntity.ok(repo.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
