package com.example.calculadora.service;

import com.example.calculadora.dto.ProductDTO;
import com.example.calculadora.entity.Product;
import com.example.calculadora.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    // IVA rate for Venezuela (16%)
    private static final BigDecimal VAT_RATE = new BigDecimal("0.16");

    public ProductDTO saveProduct(ProductDTO productDTO) {
        Product product = new Product();
        product.setName(productDTO.getName());
        product.setCode(productDTO.getCode());
        product.setCategory(productDTO.getCategory());
        product.setCost(productDTO.getCost());
        product.setProfitPercentage(productDTO.getProfitPercentage());
        product.setExemptFromVAT(productDTO.isExemptFromVAT());
        product.setPhotoUrl(productDTO.getPhotoUrl());
        product.setUpdatedAt(LocalDateTime.now());
        Product savedProduct = productRepository.save(product);
        return convertToDTO(savedProduct);
    }

    public ProductDTO getProductById(Long id) {
        return productRepository.findById(id)
                .map(this::convertToDTO)
                .orElse(null);
    }

    public ProductDTO getProductByCode(String code) {
        return productRepository.findByCode(code)
                .map(this::convertToDTO)
                .orElse(null);
    }

    public List<ProductDTO> getAllProducts() {
        return productRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }

    // Calculate price without VAT
    public BigDecimal calculatePriceWithoutVAT(BigDecimal cost, BigDecimal profitPercentage) {
        // Formula: priceWithoutVAT = cost / (1 - profitPercentage/100)
        BigDecimal one = BigDecimal.ONE;
        BigDecimal profitFactor = profitPercentage.divide(new BigDecimal("100"), 10, RoundingMode.HALF_UP);
        BigDecimal divisor = one.subtract(profitFactor);
        // Avoid division by zero
        if (divisor.compareTo(BigDecimal.ZERO) == 0) {
            return cost; // fallback
        }
        return cost.divide(divisor, 10, RoundingMode.HALF_UP);
    }

    // Calculate price with VAT
    public BigDecimal calculatePriceWithVAT(BigDecimal cost, BigDecimal profitPercentage, boolean exemptFromVAT) {
        BigDecimal priceWithoutVAT = calculatePriceWithoutVAT(cost, profitPercentage);
        if (exemptFromVAT) {
            return priceWithoutVAT;
        }
        return priceWithoutVAT.multiply(BigDecimal.ONE.add(VAT_RATE));
    }

    // Calculate utility (profit amount)
    public BigDecimal calculateUtility(BigDecimal cost, BigDecimal profitPercentage) {
        BigDecimal priceWithoutVAT = calculatePriceWithoutVAT(cost, profitPercentage);
        return priceWithoutVAT.subtract(cost);
    }

    // Convert entity to DTO
    private ProductDTO convertToDTO(Product product) {
        ProductDTO dto = new ProductDTO();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setCode(product.getCode());
        dto.setCategory(product.getCategory());
        dto.setCost(product.getCost());
        dto.setProfitPercentage(product.getProfitPercentage());
        dto.setExemptFromVAT(product.isExemptFromVAT());
        dto.setPhotoUrl(product.getPhotoUrl());
        dto.setUpdatedAt(product.getUpdatedAt());
        // Calculate derived fields
        dto.setPriceWithoutVAT(calculatePriceWithoutVAT(product.getCost(), product.getProfitPercentage()));
        dto.setPriceWithVAT(calculatePriceWithVAT(product.getCost(), product.getProfitPercentage(), product.isExemptFromVAT()));
        dto.setUtility(calculateUtility(product.getCost(), product.getProfitPercentage()));
        return dto;
    }
}