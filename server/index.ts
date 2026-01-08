import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { initDb, query, execute } from './db';
import { generateStrategy } from './ai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET all citations
app.get('/api/citations', (req, res) => {
    const citations = query('SELECT * FROM citations');

    // Attach jurisdictions and effects to each citation
    const results = citations.map((c: any) => {
        const jurisdictions = query('SELECT jurisdiction_name FROM jurisdictions WHERE citation_id = ?', [c.id]);
        const effects = query('SELECT * FROM rule_effects WHERE citation_id = ?', [c.id]);
        const dependencies = query('SELECT depends_on_id FROM dependencies WHERE citation_id = ?', [c.id]);

        return {
            ...c,
            jurisdictions: jurisdictions.map((j: any) => j.jurisdiction_name),
            effects: effects.map((e: any) => ({
                operation: e.operation,
                constraint: e.constraint_type,
                description: e.description
            })),
            dependencies: dependencies.map((d: any) => d.depends_on_id)
        };
    });

    res.json(results);
});

// GET provenance chain for a citation
app.get('/api/provenance/:id', (req, res) => {
    const { id } = req.params;

    // Use recursive CTE to find all dependencies
    const chainQuery = `
    WITH RECURSIVE dependency_chain(id, depth) AS (
      SELECT id, 0 FROM citations WHERE id = ?
      UNION ALL
      SELECT d.depends_on_id, dc.depth + 1
      FROM dependencies d
      JOIN dependency_chain dc ON d.citation_id = dc.id
    )
    SELECT DISTINCT c.* FROM citations c
    JOIN dependency_chain dc ON c.id = dc.id
    ORDER BY dc.depth DESC
  `;

    const chain = query(chainQuery, [id]);

    const detailedChain = chain.map((c: any) => {
        const jurisdictions = query('SELECT jurisdiction_name FROM jurisdictions WHERE citation_id = ?', [c.id]);
        const effects = query('SELECT * FROM rule_effects WHERE citation_id = ?', [c.id]);

        return {
            ...c,
            jurisdictions: jurisdictions.map((j: any) => j.jurisdiction_name),
            effects: effects.map((e: any) => ({
                operation: e.operation,
                constraint: e.constraint_type,
                description: e.description
            }))
        };
    });

    res.json({
        citations: detailedChain,
        rootCitation: detailedChain[detailedChain.length - 1]?.id || id,
        effectivePath: detailedChain.map((c: any) => c.code)
    });
});

// POST to generate strategy
app.post('/api/strategy', async (req, res) => {
    const { entity, accounts, journals, jurisdictions } = req.body;

    if (!entity || !jurisdictions) {
        return res.status(400).json({ error: 'Missing required fields: entity, jurisdictions' });
    }

    try {
        const strategies = await generateStrategy(entity, accounts || [], journals || [], jurisdictions);
        res.json(strategies);
    } catch (err) {
        console.error('Failed to generate strategy:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, async () => {
    await initDb();
    console.log(`Server running at http://localhost:${port}`);
});
