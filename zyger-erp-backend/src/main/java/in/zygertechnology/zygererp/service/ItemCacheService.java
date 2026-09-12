package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.ItemMaster;
import in.zygertechnology.zygererp.repo.ItemRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ItemCacheService {

    private final ItemRepository items;

    public ItemCacheService(ItemRepository items) { this.items = items; }

    @Cacheable(value = "items", key = "T(java.util.Objects).toString(#root.args[0])", condition = "#root.args[0] != null")
    public Optional<ItemMaster> findByCode(String code) {
        return items.findByCode(code);
    }

    public void invalidate(String code) {
        // Spring cache eviction done via @CacheEvict on mutation points
    }
}
