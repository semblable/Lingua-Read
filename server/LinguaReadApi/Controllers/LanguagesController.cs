using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LinguaReadApi.Data;
using LinguaReadApi.Models;

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LanguagesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LanguagesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/languages
        [HttpGet]
        public async Task<ActionResult<IEnumerable<LanguageDto>>> GetLanguages()
        {
            var languages = await _context.Languages
                .Select(l => new LanguageDto
                {
                    LanguageId = l.LanguageId,
                    Name = l.Name,
                    Code = l.Code
                })
                .ToListAsync();
                
            return languages;
        }
        
        // GET: api/languages/5
        [HttpGet("{id}")]
        public async Task<ActionResult<LanguageDto>> GetLanguage(int id)
        {
            var language = await _context.Languages.FindAsync(id);
            
            if (language == null)
            {
                return NotFound();
            }
            
            return new LanguageDto
            {
                LanguageId = language.LanguageId,
                Name = language.Name,
                Code = language.Code
            };
        }
    }
    
    public class LanguageDto
    {
        public int LanguageId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
    }
} 